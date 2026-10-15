//! discere-sandbox: runs one learner program in a Windows AppContainer with no capabilities,
//! inside a Job Object that limits processes, memory, CPU time and wall time.
//!
//! The CLI contract and the limits it reports are described in README.md.

#[cfg(not(windows))]
fn main() {
    eprintln!("discere-sandbox: this helper only runs on Windows.");
    std::process::exit(2);
}

#[cfg(windows)]
fn main() {
    std::process::exit(windows::main());
}

#[cfg(windows)]
mod windows {
    use std::ffi::{c_void, OsStr, OsString};
    use std::mem::{size_of, zeroed};
    use std::os::windows::ffi::OsStrExt;
    use std::path::{Path, PathBuf};
    use std::ptr::{null, null_mut};
    use std::time::{Duration, Instant};

    use windows_sys::Win32::Foundation::*;
    use windows_sys::Win32::Security::Authorization::*;
    use windows_sys::Win32::Security::Isolation::*;
    use windows_sys::Win32::Security::*;
    use windows_sys::Win32::Storage::FileSystem::*;
    use windows_sys::Win32::System::Console::*;
    use windows_sys::Win32::System::Diagnostics::Debug::*;
    use windows_sys::Win32::System::IO::*;
    use windows_sys::Win32::System::JobObjects::*;
    use windows_sys::Win32::System::Memory::*;
    use windows_sys::Win32::System::SystemServices::{
        ACCESS_ALLOWED_ACE_TYPE, JOB_OBJECT_MSG_ACTIVE_PROCESS_LIMIT, JOB_OBJECT_MSG_ACTIVE_PROCESS_ZERO,
        JOB_OBJECT_MSG_END_OF_JOB_TIME, JOB_OBJECT_MSG_JOB_MEMORY_LIMIT,
        JOB_OBJECT_MSG_PROCESS_MEMORY_LIMIT,
    };
    use windows_sys::Win32::System::Threading::*;

    const PROFILE: &str = "Discere.Sandbox";
    /// Read and execute, as granted on a toolchain or package folder.
    const READ_MASK: u32 = FILE_GENERIC_READ | FILE_GENERIC_EXECUTE;
    /// Full control, as granted on the work folder.
    const FULL_MASK: u32 = FILE_ALL_ACCESS;
    /// Exit code given to processes the helper kills at a limit.
    /// Exit code the helper gives processes it kills at the wall or CPU limit. The status file
    /// reports exitCode null for those, so the value itself is never seen by the caller.
    const KILLED: u32 = 0xC000_0517;

    type R<T> = Result<T, String>;

    pub fn main() -> i32 {
        unsafe {
            SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX | SEM_NOOPENFILEERRORBOX);
        }
        let args: Vec<OsString> = std::env::args_os().skip(1).collect();
        let command = args.first().and_then(|a| a.to_str()).unwrap_or("");
        let rest = if args.is_empty() { &args[..] } else { &args[1..] };
        match command {
            "run" => run_command(rest),
            "grant" => grant_command(rest),
            "check" => check_command(),
            _ => {
                eprintln!(
                    "discere-sandbox: usage: discere-sandbox run|grant|check (see README.md)"
                );
                2
            }
        }
    }

    // ---------- small helpers ----------

    fn wide(s: impl AsRef<OsStr>) -> Vec<u16> {
        s.as_ref().encode_wide().chain(Some(0)).collect()
    }

    fn last_error(what: &str) -> String {
        let code = unsafe { GetLastError() };
        format!("{what} failed (Windows error {code})")
    }

    fn json_string(s: &str) -> String {
        let mut out = String::with_capacity(s.len() + 2);
        out.push('"');
        for c in s.chars() {
            match c {
                '"' => out.push_str("\\\""),
                '\\' => out.push_str("\\\\"),
                '\n' => out.push_str("\\n"),
                '\r' => out.push_str("\\r"),
                '\t' => out.push_str("\\t"),
                c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
                c => out.push(c),
            }
        }
        out.push('"');
        out
    }

    fn absolute(path: &OsStr, flag: &str) -> R<PathBuf> {
        let p = std::path::absolute(Path::new(path))
            .map_err(|e| format!("{flag} {}: {e}", Path::new(path).display()))?;
        if !p.is_dir() {
            return Err(format!("{flag} {} is not a directory", p.display()));
        }
        Ok(p)
    }

    // ---------- AppContainer profile and ACLs ----------

    /// Creates the profile on first use; afterwards derives the same SID from its name.
    fn container_sid() -> R<PSID> {
        let name = wide(PROFILE);
        let display = wide("Discere sandbox");
        let description = wide("Runs Discere practice programs with no capabilities.");
        let mut sid: PSID = null_mut();
        let hr = unsafe {
            CreateAppContainerProfile(
                name.as_ptr(),
                display.as_ptr(),
                description.as_ptr(),
                null(),
                0,
                &mut sid,
            )
        };
        if hr >= 0 {
            return Ok(sid);
        }
        // HRESULT_FROM_WIN32(ERROR_ALREADY_EXISTS)
        if hr as u32 == 0x8007_00B7 {
            let hr = unsafe { DeriveAppContainerSidFromAppContainerName(name.as_ptr(), &mut sid) };
            if hr >= 0 {
                return Ok(sid);
            }
            return Err(format!(
                "DeriveAppContainerSidFromAppContainerName failed (0x{:08X})",
                hr as u32
            ));
        }
        Err(format!("CreateAppContainerProfile failed (0x{:08X})", hr as u32))
    }

    fn sid_string(sid: PSID) -> String {
        let mut text: windows_sys::core::PWSTR = null_mut();
        unsafe {
            if ConvertSidToStringSidW(sid, &mut text) == 0 || text.is_null() {
                return String::new();
            }
            let mut len = 0;
            while *text.add(len) != 0 {
                len += 1;
            }
            let s = String::from_utf16_lossy(std::slice::from_raw_parts(text, len));
            LocalFree(text as _);
            s
        }
    }

    /// True when the folder's DACL already allows `mask` to the SID, inheritably
    /// (an ACE granted on this folder or inherited from a granted parent both count).
    fn has_grant(path: &Path, sid: PSID, mask: u32) -> R<bool> {
        let name = wide(path);
        let mut dacl: *mut ACL = null_mut();
        let mut sd: PSECURITY_DESCRIPTOR = null_mut();
        let err = unsafe {
            GetNamedSecurityInfoW(
                name.as_ptr(),
                SE_FILE_OBJECT,
                DACL_SECURITY_INFORMATION,
                null_mut(),
                null_mut(),
                &mut dacl,
                null_mut(),
                &mut sd,
            )
        };
        if err != 0 {
            return Err(format!("reading the ACL of {} failed (Windows error {err})", path.display()));
        }
        let mut found = false;
        unsafe {
            if !dacl.is_null() {
                let count = (*dacl).AceCount as u32;
                for i in 0..count {
                    let mut ace: *mut c_void = null_mut();
                    if GetAce(dacl, i, &mut ace) == 0 {
                        continue;
                    }
                    let header = &*(ace as *const ACE_HEADER);
                    if header.AceType as u32 != ACCESS_ALLOWED_ACE_TYPE {
                        continue;
                    }
                    let allowed = &*(ace as *const ACCESS_ALLOWED_ACE);
                    let flags = header.AceFlags as u32;
                    let inherits = flags & (OBJECT_INHERIT_ACE | CONTAINER_INHERIT_ACE)
                        == (OBJECT_INHERIT_ACE | CONTAINER_INHERIT_ACE)
                        && flags & INHERIT_ONLY_ACE == 0;
                    let ace_sid = &allowed.SidStart as *const u32 as PSID;
                    if inherits && allowed.Mask & mask == mask && EqualSid(ace_sid, sid) != 0 {
                        found = true;
                        break;
                    }
                }
            }
            LocalFree(sd as _);
        }
        Ok(found)
    }

    /// Adds an inheritable allow ACE for the SID and propagates it to everything below.
    fn grant(path: &Path, sid: PSID, mask: u32) -> R<()> {
        let name = wide(path);
        let mut old: *mut ACL = null_mut();
        let mut sd: PSECURITY_DESCRIPTOR = null_mut();
        unsafe {
            let err = GetNamedSecurityInfoW(
                name.as_ptr(),
                SE_FILE_OBJECT,
                DACL_SECURITY_INFORMATION,
                null_mut(),
                null_mut(),
                &mut old,
                null_mut(),
                &mut sd,
            );
            if err != 0 {
                return Err(format!("reading the ACL of {} failed (Windows error {err})", path.display()));
            }
            let entry = EXPLICIT_ACCESS_W {
                grfAccessPermissions: mask,
                grfAccessMode: GRANT_ACCESS,
                grfInheritance: SUB_CONTAINERS_AND_OBJECTS_INHERIT,
                Trustee: TRUSTEE_W {
                    pMultipleTrustee: null_mut(),
                    MultipleTrusteeOperation: NO_MULTIPLE_TRUSTEE,
                    TrusteeForm: TRUSTEE_IS_SID,
                    TrusteeType: TRUSTEE_IS_WELL_KNOWN_GROUP,
                    ptstrName: sid as *mut u16,
                },
            };
            let mut new: *mut ACL = null_mut();
            let err = SetEntriesInAclW(1, &entry, old, &mut new);
            if err != 0 {
                LocalFree(sd as _);
                return Err(format!("building the ACL for {} failed (Windows error {err})", path.display()));
            }
            let err = SetNamedSecurityInfoW(
                name.as_ptr(),
                SE_FILE_OBJECT,
                DACL_SECURITY_INFORMATION,
                null_mut(),
                null_mut(),
                new,
                null(),
            );
            LocalFree(new as _);
            LocalFree(sd as _);
            if err != 0 {
                return Err(format!("setting the ACL of {} failed (Windows error {err})", path.display()));
            }
        }
        Ok(())
    }

    fn ensure_grant(path: &Path, sid: PSID, mask: u32) -> R<()> {
        if has_grant(path, sid, mask)? {
            return Ok(());
        }
        grant(path, sid, mask)
    }

    // ---------- process creation ----------

    /// Quotes one argument the way the Microsoft C runtime parses it back.
    fn quote(arg: &OsStr, out: &mut Vec<u16>) {
        let a: Vec<u16> = arg.encode_wide().collect();
        let needs = a.is_empty()
            || a.iter().any(|&c| c == b' ' as u16 || c == b'\t' as u16 || c == b'"' as u16);
        if !needs {
            out.extend_from_slice(&a);
            return;
        }
        out.push(b'"' as u16);
        let mut backslashes = 0usize;
        for &c in &a {
            if c == b'\\' as u16 {
                backslashes += 1;
            } else if c == b'"' as u16 {
                out.extend(std::iter::repeat(b'\\' as u16).take(backslashes * 2 + 1));
                out.push(c);
                backslashes = 0;
            } else {
                out.extend(std::iter::repeat(b'\\' as u16).take(backslashes));
                out.push(c);
                backslashes = 0;
            }
        }
        out.extend(std::iter::repeat(b'\\' as u16).take(backslashes * 2));
        out.push(b'"' as u16);
    }

    fn command_line(argv: &[OsString]) -> Vec<u16> {
        let mut out = Vec::new();
        for (i, a) in argv.iter().enumerate() {
            if i > 0 {
                out.push(b' ' as u16);
            }
            quote(a, &mut out);
        }
        out.push(0);
        out
    }

    fn system_var(name: &str, fallback: &str) -> String {
        std::env::var(name).unwrap_or_else(|_| fallback.to_string())
    }

    fn local_app_data() -> String {
        std::env::var("LOCALAPPDATA").unwrap_or_else(|_| {
            format!("{}\\AppData\\Local", system_var("USERPROFILE", "C:\\Users\\Default"))
        })
    }

    /// An empty environment plus the few variables Windows programs cannot start without,
    /// TEMP/TMP in the work folder, and whatever the caller passes with --env.
    fn environment(work: &Path, extra: &[(String, String)]) -> Vec<(String, String)> {
        let root = system_var("SystemRoot", "C:\\Windows");
        let mut vars: Vec<(String, String)> = vec![
            ("SystemRoot".into(), root.clone()),
            ("SystemDrive".into(), system_var("SystemDrive", "C:")),
            ("windir".into(), system_var("windir", &root)),
            ("TEMP".into(), work.display().to_string()),
            ("TMP".into(), work.display().to_string()),
        ];
        for (k, v) in extra {
            vars.retain(|(key, _)| !key.eq_ignore_ascii_case(k));
            vars.push((k.clone(), v.clone()));
        }
        vars.sort_by(|a, b| a.0.to_uppercase().cmp(&b.0.to_uppercase()));
        vars
    }

    fn env_block(vars: &[(String, String)]) -> Vec<u16> {
        let mut block = Vec::new();
        for (k, v) in vars {
            block.extend(OsStr::new(&format!("{k}={v}")).encode_wide());
            block.push(0);
        }
        block.push(0);
        block
    }

    struct Handle(HANDLE);
    impl Drop for Handle {
        fn drop(&mut self) {
            if !self.0.is_null() && self.0 != INVALID_HANDLE_VALUE {
                unsafe { CloseHandle(self.0) };
            }
        }
    }

    struct Limits {
        memory_mb: u64,
        cpu_ms: u64,
        wall_ms: u64,
        processes: u32,
    }

    struct Outcome {
        exit_code: Option<u32>,
        reason: &'static str,
        message: String,
    }

    fn set_job<T>(job: HANDLE, class: JOBOBJECTINFOCLASS, info: &T, what: &str) -> R<()> {
        let ok = unsafe {
            SetInformationJobObject(job, class, info as *const T as *const c_void, size_of::<T>() as u32)
        };
        if ok == 0 {
            return Err(last_error(what));
        }
        Ok(())
    }

    fn make_job(limits: &Limits, port: HANDLE) -> R<Handle> {
        let job = Handle(unsafe { CreateJobObjectW(null(), null()) });
        if job.0.is_null() {
            return Err(last_error("CreateJobObject"));
        }
        let mut ext: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { zeroed() };
        ext.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            | JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION
            | JOB_OBJECT_LIMIT_ACTIVE_PROCESS
            | JOB_OBJECT_LIMIT_JOB_MEMORY
            | JOB_OBJECT_LIMIT_JOB_TIME;
        ext.BasicLimitInformation.ActiveProcessLimit = limits.processes;
        ext.BasicLimitInformation.PerJobUserTimeLimit = (limits.cpu_ms as i64) * 10_000;
        ext.JobMemoryLimit = (limits.memory_mb as usize) * 1024 * 1024;
        set_job(job.0, JobObjectExtendedLimitInformation, &ext, "setting the job limits")?;

        // Post a message at the CPU limit instead of silently terminating, so the helper can
        // tell a CPU stop from any other exit. The helper terminates the job itself.
        let end = JOBOBJECT_END_OF_JOB_TIME_INFORMATION { EndOfJobTimeAction: JOB_OBJECT_POST_AT_END_OF_JOB };
        set_job(job.0, JobObjectEndOfJobTimeInformation, &end, "setting the CPU limit action")?;

        let ui = JOBOBJECT_BASIC_UI_RESTRICTIONS {
            UIRestrictionsClass: JOB_OBJECT_UILIMIT_DESKTOP
                | JOB_OBJECT_UILIMIT_DISPLAYSETTINGS
                | JOB_OBJECT_UILIMIT_EXITWINDOWS
                | JOB_OBJECT_UILIMIT_GLOBALATOMS
                | JOB_OBJECT_UILIMIT_HANDLES
                | JOB_OBJECT_UILIMIT_READCLIPBOARD
                | JOB_OBJECT_UILIMIT_WRITECLIPBOARD
                | JOB_OBJECT_UILIMIT_SYSTEMPARAMETERS,
        };
        set_job(job.0, JobObjectBasicUIRestrictions, &ui, "setting the UI restrictions")?;

        let assoc = JOBOBJECT_ASSOCIATE_COMPLETION_PORT { CompletionKey: null_mut(), CompletionPort: port };
        set_job(job.0, JobObjectAssociateCompletionPortInformation, &assoc, "attaching the job port")?;
        Ok(job)
    }

    fn has_console() -> bool {
        unsafe { !GetConsoleWindow().is_null() }
    }

    /// Starts argv[0] suspended in the AppContainer, puts it in the job, then resumes it.
    fn spawn(
        sid: PSID,
        job: HANDLE,
        argv: &[OsString],
        cwd: &Path,
        vars: &[(String, String)],
        inherit_std: bool,
    ) -> R<(PROCESS_INFORMATION, bool)> {
        unsafe {
            let mut size = 0usize;
            InitializeProcThreadAttributeList(null_mut(), 2, 0, &mut size);
            let mut buffer = vec![0u8; size];
            let list = buffer.as_mut_ptr() as LPPROC_THREAD_ATTRIBUTE_LIST;
            if InitializeProcThreadAttributeList(list, 2, 0, &mut size) == 0 {
                return Err(last_error("InitializeProcThreadAttributeList"));
            }
            let caps = SECURITY_CAPABILITIES {
                AppContainerSid: sid,
                Capabilities: null_mut(),
                CapabilityCount: 0,
                Reserved: 0,
            };
            if UpdateProcThreadAttribute(
                list,
                0,
                PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES as usize,
                &caps as *const _ as *const c_void,
                size_of::<SECURITY_CAPABILITIES>(),
                null_mut(),
                null(),
            ) == 0
            {
                DeleteProcThreadAttributeList(list);
                return Err(last_error("setting the AppContainer attribute"));
            }

            // Only the three standard handles are inherited, nothing else the helper holds.
            let mut std_handles = [null_mut(); 3];
            let mut inherit: Vec<HANDLE> = Vec::new();
            if inherit_std {
                for (i, which) in [STD_INPUT_HANDLE, STD_OUTPUT_HANDLE, STD_ERROR_HANDLE].iter().enumerate() {
                    let h = GetStdHandle(*which);
                    if h.is_null() || h == INVALID_HANDLE_VALUE {
                        continue;
                    }
                    if SetHandleInformation(h, HANDLE_FLAG_INHERIT, HANDLE_FLAG_INHERIT) == 0 {
                        continue;
                    }
                    std_handles[i] = h;
                    if !inherit.contains(&h) {
                        inherit.push(h);
                    }
                }
            }
            if !inherit.is_empty()
                && UpdateProcThreadAttribute(
                    list,
                    0,
                    PROC_THREAD_ATTRIBUTE_HANDLE_LIST as usize,
                    inherit.as_ptr() as *const c_void,
                    inherit.len() * size_of::<HANDLE>(),
                    null_mut(),
                    null(),
                ) == 0
            {
                DeleteProcThreadAttributeList(list);
                return Err(last_error("setting the inherited handle list"));
            }

            let mut si: STARTUPINFOEXW = zeroed();
            si.StartupInfo.cb = size_of::<STARTUPINFOEXW>() as u32;
            si.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
            si.StartupInfo.hStdInput = std_handles[0];
            si.StartupInfo.hStdOutput = std_handles[1];
            si.StartupInfo.hStdError = std_handles[2];
            si.lpAttributeList = list;

            // With a console (a terminal, or the hidden one Node gives a windowsHide child) the
            // program shares it. Without one, it gets a hidden console of its own, so programs
            // it starts (rustc's linker) never flash a window.
            let mut flags = CREATE_SUSPENDED | EXTENDED_STARTUPINFO_PRESENT | CREATE_UNICODE_ENVIRONMENT;
            if !has_console() {
                flags |= CREATE_NO_WINDOW;
            }

            // CreateProcess refuses an AppContainer child without LOCALAPPDATA (error 203): it
            // derives the container's folder from it, and then points LOCALAPPDATA, TEMP and TMP
            // at that folder. The child's block is replaced before it runs (see replace_environment).
            let mut creation_vars = vars.to_vec();
            if !creation_vars.iter().any(|(k, _)| k.eq_ignore_ascii_case("LOCALAPPDATA")) {
                creation_vars.push(("LOCALAPPDATA".into(), local_app_data()));
            }
            let env = env_block(&creation_vars);
            let app = wide(&argv[0]);
            let mut cmd = command_line(argv);
            let dir = wide(cwd);
            let mut pi: PROCESS_INFORMATION = zeroed();
            let ok = CreateProcessW(
                app.as_ptr(),
                cmd.as_mut_ptr(),
                null(),
                null(),
                if inherit.is_empty() { 0 } else { 1 },
                flags,
                env.as_ptr() as *const c_void,
                dir.as_ptr(),
                &si.StartupInfo,
                &mut pi,
            );
            let error = GetLastError();
            DeleteProcThreadAttributeList(list);
            if ok == 0 {
                return Err(format!(
                    "starting {} failed (Windows error {error})",
                    Path::new(&argv[0]).display()
                ));
            }
            if AssignProcessToJobObject(job, pi.hProcess) == 0 {
                let e = last_error("AssignProcessToJobObject");
                TerminateProcess(pi.hProcess, 1);
                CloseHandle(pi.hThread);
                CloseHandle(pi.hProcess);
                return Err(e);
            }
            let replaced = replace_environment(pi.hProcess, &env_block(vars));
            if ResumeThread(pi.hThread) == u32::MAX {
                let e = last_error("ResumeThread");
                TerminateJobObject(job, 1);
                CloseHandle(pi.hThread);
                CloseHandle(pi.hProcess);
                return Err(e);
            }
            CloseHandle(pi.hThread);
            Ok((pi, replaced))
        }
    }

    #[repr(C)]
    struct ProcessBasicInformation {
        exit_status: i32,
        peb: *mut c_void,
        affinity: usize,
        priority: i32,
        pid: usize,
        parent: usize,
    }

    #[link(name = "ntdll")]
    extern "system" {
        fn NtQueryInformationProcess(
            process: HANDLE,
            class: u32,
            info: *mut c_void,
            length: u32,
            returned: *mut u32,
        ) -> i32;
    }

    /// Swaps the suspended child's environment block for exactly the one the caller asked for.
    ///
    /// Windows rewrites LOCALAPPDATA, TEMP and TMP for an AppContainer child to the profile's
    /// shared folder (%LOCALAPPDATA%\Packages\discere.sandbox\AC\Temp), which would let one run
    /// leave files for the next. The child has not run a single instruction yet, so its PEB's
    /// process parameters are pointed at a fresh block. x64 layout: PEB+0x20 is
    /// ProcessParameters; in RTL_USER_PROCESS_PARAMETERS, +0x80 is Environment and +0x3F0 is
    /// EnvironmentSize. Returns false (and leaves the Windows values) if any step fails.
    fn replace_environment(process: HANDLE, block: &[u16]) -> bool {
        unsafe {
            let mut info: ProcessBasicInformation = zeroed();
            let mut returned = 0u32;
            if NtQueryInformationProcess(
                process,
                0,
                &mut info as *mut _ as *mut c_void,
                size_of::<ProcessBasicInformation>() as u32,
                &mut returned,
            ) < 0
                || info.peb.is_null()
            {
                return false;
            }
            let mut params: usize = 0;
            let mut read = 0usize;
            if ReadProcessMemory(
                process,
                (info.peb as usize + 0x20) as *const c_void,
                &mut params as *mut usize as *mut c_void,
                size_of::<usize>(),
                &mut read,
            ) == 0
                || params == 0
            {
                return false;
            }
            let bytes = block.len() * 2;
            let remote = VirtualAllocEx(process, null(), bytes, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
            if remote.is_null() {
                return false;
            }
            let mut written = 0usize;
            if WriteProcessMemory(process, remote, block.as_ptr() as *const c_void, bytes, &mut written) == 0 {
                return false;
            }
            let size = bytes;
            WriteProcessMemory(
                process,
                (params + 0x3F0) as *const c_void,
                &size as *const usize as *const c_void,
                size_of::<usize>(),
                &mut written,
            );
            let pointer = remote as usize;
            WriteProcessMemory(
                process,
                (params + 0x80) as *const c_void,
                &pointer as *const usize as *const c_void,
                size_of::<usize>(),
                &mut written,
            ) != 0
        }
    }

    fn user_time(job: HANDLE) -> i64 {
        unsafe {
            let mut info: JOBOBJECT_BASIC_ACCOUNTING_INFORMATION = zeroed();
            if QueryInformationJobObject(
                job,
                JobObjectBasicAccountingInformation,
                &mut info as *mut _ as *mut c_void,
                size_of::<JOBOBJECT_BASIC_ACCOUNTING_INFORMATION>() as u32,
                null_mut(),
            ) == 0
            {
                return 0;
            }
            info.TotalUserTime
        }
    }

    fn peak_memory(job: HANDLE) -> usize {
        unsafe {
            let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = zeroed();
            if QueryInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                &mut info as *mut _ as *mut c_void,
                size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
                null_mut(),
            ) == 0
            {
                return 0;
            }
            info.PeakJobMemoryUsed
        }
    }

    #[derive(Default)]
    struct Seen {
        cpu: bool,
        memory: bool,
        processes: bool,
        zero: bool,
    }

    fn note(seen: &mut Seen, message: u32) {
        match message {
            JOB_OBJECT_MSG_END_OF_JOB_TIME => seen.cpu = true,
            JOB_OBJECT_MSG_JOB_MEMORY_LIMIT | JOB_OBJECT_MSG_PROCESS_MEMORY_LIMIT => seen.memory = true,
            JOB_OBJECT_MSG_ACTIVE_PROCESS_LIMIT => seen.processes = true,
            JOB_OBJECT_MSG_ACTIVE_PROCESS_ZERO => seen.zero = true,
            _ => {}
        }
    }

    fn next_message(port: HANDLE, timeout_ms: u32) -> Option<u32> {
        let mut message = 0u32;
        let mut key = 0usize;
        let mut overlapped: *mut OVERLAPPED = null_mut();
        let ok = unsafe { GetQueuedCompletionStatus(port, &mut message, &mut key, &mut overlapped, timeout_ms) };
        if ok == 0 {
            None
        } else {
            Some(message)
        }
    }

    fn execute(
        sid: PSID,
        argv: &[OsString],
        cwd: &Path,
        vars: &[(String, String)],
        limits: &Limits,
        inherit_std: bool,
    ) -> R<Outcome> {
        let port = Handle(unsafe { CreateIoCompletionPort(INVALID_HANDLE_VALUE, null_mut(), 0, 1) });
        if port.0.is_null() {
            return Err(last_error("CreateIoCompletionPort"));
        }
        let job = make_job(limits, port.0)?;
        let started = Instant::now();
        let (pi, replaced) = spawn(sid, job.0, argv, cwd, vars, inherit_std)?;
        let process = Handle(pi.hProcess);
        let deadline = started + Duration::from_millis(limits.wall_ms);
        let cpu_limit = (limits.cpu_ms as i64) * 10_000;
        let mut seen = Seen::default();
        let mut wall = false;

        loop {
            if unsafe { WaitForSingleObject(process.0, 0) } == WAIT_OBJECT_0 {
                break;
            }
            let now = Instant::now();
            if now >= deadline {
                wall = true;
                unsafe { TerminateJobObject(job.0, KILLED) };
                break;
            }
            let wait = (deadline - now).as_millis().min(50) as u32;
            if let Some(message) = next_message(port.0, wait) {
                note(&mut seen, message);
            }
            // The CPU message is a notification and Windows does not promise delivery, so the
            // accounting is the backstop.
            if seen.cpu || user_time(job.0) >= cpu_limit {
                seen.cpu = true;
                unsafe { TerminateJobObject(job.0, KILLED) };
                break;
            }
        }

        // Anything the program left running dies with it, as under bubblewrap.
        unsafe {
            TerminateJobObject(job.0, KILLED);
            WaitForSingleObject(process.0, 5000);
        }
        // Collect limit messages that were queued before the exit was seen.
        let drain_until = Instant::now() + Duration::from_millis(250);
        while !seen.zero && Instant::now() < drain_until {
            match next_message(port.0, 25) {
                Some(m) => note(&mut seen, m),
                None => {}
            }
        }

        let mut code = 0u32;
        unsafe { GetExitCodeProcess(process.0, &mut code) };
        let memory_limit = (limits.memory_mb as usize) * 1024 * 1024;
        // Backstop for a lost memory message: a failed exit with the commit peak at the limit.
        if !seen.memory && code != 0 && peak_memory(job.0) + 4 * 1024 * 1024 >= memory_limit {
            seen.memory = true;
        }

        let elapsed = started.elapsed().as_millis();
        // A refused allocation or process start is only the reason when the program then failed.
        // Code that survives one (Python's platform module tries `cmd /c ver` and carries on)
        // exits 0 and is reported as ok, with the refusal noted in the message.
        let mut notes = Vec::new();
        if seen.memory {
            notes.push(format!("an allocation beyond {} MB was refused", limits.memory_mb));
        }
        if seen.processes {
            notes.push(format!("a process start beyond {} was refused", limits.processes));
        }
        let outcome = if wall {
            Outcome { exit_code: None, reason: "wall", message: format!("stopped at the wall-clock limit of {} ms", limits.wall_ms) }
        } else if seen.cpu {
            Outcome { exit_code: None, reason: "cpu", message: format!("stopped at the CPU limit of {} ms", limits.cpu_ms) }
        } else if seen.memory && code != 0 {
            Outcome { exit_code: Some(code), reason: "memory", message: format!("reached the memory limit of {} MB", limits.memory_mb) }
        } else if seen.processes && code != 0 {
            Outcome { exit_code: Some(code), reason: "processes", message: format!("tried to run more than {} process(es)", limits.processes) }
        } else {
            let mut message = format!("exited after {elapsed} ms");
            if !notes.is_empty() {
                message.push_str(&format!(" ({})", notes.join("; ")));
            }
            Outcome { exit_code: Some(code), reason: "ok", message }
        };
        let mut outcome = outcome;
        if !replaced {
            outcome.message.push_str(" (TEMP/TMP were left at the AppContainer's own folder)");
        }
        Ok(outcome)
    }

    fn write_status(path: &Path, outcome: &Outcome) -> R<()> {
        let code = match outcome.exit_code {
            Some(c) => (c as i32).to_string(),
            None => "null".into(),
        };
        let body = format!(
            "{{\"exitCode\":{},\"reason\":{},\"message\":{}}}\n",
            code,
            json_string(outcome.reason),
            json_string(&outcome.message)
        );
        std::fs::write(path, body).map_err(|e| format!("writing {}: {e}", path.display()))
    }

    // ---------- commands ----------

    fn run_command(args: &[OsString]) -> i32 {
        let mut status: Option<PathBuf> = None;
        // Find --status early so even a parse error lands in the status file.
        for w in args.windows(2) {
            if w[0] == "--" {
                break;
            }
            if w[0] == "--status" {
                status = Some(PathBuf::from(&w[1]));
            }
        }
        let fail = |message: String| -> i32 {
            eprintln!("discere-sandbox: {message}");
            if let Some(path) = &status {
                let _ = write_status(path, &Outcome { exit_code: None, reason: "error", message });
            }
            2
        };
        let result = (|| -> R<Outcome> {
            let mut work = None;
            let mut reads = Vec::new();
            let mut env = Vec::new();
            let (mut memory, mut cpu, mut wall, mut procs) = (None, None, None, None);
            let mut i = 0;
            let value = |i: usize, flag: &str| -> R<&OsString> {
                args.get(i + 1).ok_or_else(|| format!("{flag} needs a value"))
            };
            let number = |v: &OsString, flag: &str| -> R<u64> {
                v.to_str()
                    .and_then(|s| s.parse::<u64>().ok())
                    .filter(|n| *n > 0)
                    .ok_or_else(|| format!("{flag} needs a positive whole number"))
            };
            while i < args.len() {
                let flag = args[i].to_str().unwrap_or("");
                match flag {
                    "--" => {
                        i += 1;
                        break;
                    }
                    "--work" => work = Some(absolute(value(i, flag)?, flag)?),
                    "--read" => reads.push(absolute(value(i, flag)?, flag)?),
                    "--env" => {
                        let v = value(i, flag)?.to_str().ok_or("--env must be valid Unicode")?;
                        let (k, val) = v.split_once('=').ok_or("--env needs KEY=VALUE")?;
                        if k.is_empty() {
                            return Err("--env needs KEY=VALUE".into());
                        }
                        env.push((k.to_string(), val.to_string()));
                    }
                    "--memory-mb" => memory = Some(number(value(i, flag)?, flag)?),
                    "--cpu-ms" => cpu = Some(number(value(i, flag)?, flag)?),
                    "--wall-ms" => wall = Some(number(value(i, flag)?, flag)?),
                    "--processes" => procs = Some(number(value(i, flag)?, flag)?),
                    "--status" => {
                        value(i, flag)?;
                    }
                    _ => return Err(format!("unknown option {}", args[i].to_string_lossy())),
                }
                i += 2;
            }
            let argv: Vec<OsString> = args[i.min(args.len())..].to_vec();
            if argv.is_empty() {
                return Err("nothing to run: give the program after --".into());
            }
            if status.is_none() {
                return Err("--status is required".into());
            }
            let work = work.ok_or("--work is required")?;
            let limits = Limits {
                memory_mb: memory.ok_or("--memory-mb is required")?,
                cpu_ms: cpu.ok_or("--cpu-ms is required")?,
                wall_ms: wall.ok_or("--wall-ms is required")?,
                processes: procs.ok_or("--processes is required")?.min(u32::MAX as u64) as u32,
            };
            let mut argv = argv;
            argv[0] = std::path::absolute(Path::new(&argv[0]))
                .map_err(|e| format!("program path: {e}"))?
                .into_os_string();

            let sid = container_sid()?;
            grant(&work, sid, FULL_MASK)?;
            for dir in &reads {
                ensure_grant(dir, sid, READ_MASK)?;
            }
            let vars = environment(&work, &env);
            execute(sid, &argv, &work, &vars, &limits, true)
        })();
        match result {
            Ok(outcome) => match write_status(status.as_ref().unwrap(), &outcome) {
                Ok(()) => 0,
                Err(e) => {
                    eprintln!("discere-sandbox: {e}");
                    2
                }
            },
            Err(message) => fail(message),
        }
    }

    fn grant_command(args: &[OsString]) -> i32 {
        let result = (|| -> R<usize> {
            let mut dirs = Vec::new();
            let mut i = 0;
            while i < args.len() {
                if args[i] != "--read" {
                    return Err(format!("unknown option {}", args[i].to_string_lossy()));
                }
                let v = args.get(i + 1).ok_or("--read needs a value")?;
                dirs.push(absolute(v, "--read")?);
                i += 2;
            }
            if dirs.is_empty() {
                return Err("give at least one --read <dir>".into());
            }
            let sid = container_sid()?;
            let mut changed = 0;
            for dir in &dirs {
                if !has_grant(dir, sid, READ_MASK)? {
                    grant(dir, sid, READ_MASK)?;
                    changed += 1;
                }
            }
            Ok(changed)
        })();
        match result {
            Ok(_) => 0,
            Err(e) => {
                eprintln!("discere-sandbox: {e}");
                2
            }
        }
    }

    fn check_command() -> i32 {
        let result = (|| -> R<String> {
            let sid = container_sid()?;
            let root = system_var("SystemRoot", "C:\\Windows");
            let system32 = PathBuf::from(&root).join("System32");
            let argv: Vec<OsString> = vec![
                system32.join("cmd.exe").into_os_string(),
                "/d".into(),
                "/c".into(),
                "exit 7".into(),
            ];
            let env = environment(&system32, &[]);
            let limits = Limits { memory_mb: 256, cpu_ms: 5000, wall_ms: 10000, processes: 1 };
            let outcome = execute(sid, &argv, &system32, &env, &limits, false)?;
            if outcome.exit_code != Some(7) {
                return Err(format!(
                    "a test process in the sandbox did not finish normally ({}: {})",
                    outcome.reason, outcome.message
                ));
            }
            Ok(sid_string(sid))
        })();
        match result {
            Ok(sid) => {
                println!(
                    "{{\"ok\":true,\"appContainer\":true,\"jobObject\":true,\"profile\":{},\"sid\":{}}}",
                    json_string(PROFILE),
                    json_string(&sid)
                );
                0
            }
            Err(e) => {
                println!(
                    "{{\"ok\":false,\"appContainer\":false,\"profile\":{},\"message\":{}}}",
                    json_string(PROFILE),
                    json_string(&e)
                );
                eprintln!("discere-sandbox: {e}");
                2
            }
        }
    }
}
