"""Execute a learner SELECT in a fresh, bounded SQLite database. No learner Python is evaluated."""
import json
import math
import sqlite3
import sys
import time

FUNCTIONS = frozenset("""abs avg coalesce count dense_rank first_value group_concat ifnull iif instr
lag last_value lead length like lower ltrim max min nth_value ntile nullif percent_rank rank
replace round row_number rtrim substr substring sum total trim typeof unicode upper
cume_dist""".split())

def run(payload):
    if sys.version_info < (3, 12) or sqlite3.sqlite_version_info < (3, 39):
        return {"error": "runtime", "message": "SQL practice needs Python 3.12 or later with SQLite 3.39 or later."}
    query = payload["query"]
    if not isinstance(query, str) or not query.strip() or len(query) > 16000:
        return {"error": "query", "message": "Write one SELECT query, up to 16,000 characters."}
    db = sqlite3.connect(":memory:")
    try:
        db.setconfig(sqlite3.SQLITE_DBCONFIG_DEFENSIVE, True)
        db.setconfig(sqlite3.SQLITE_DBCONFIG_TRUSTED_SCHEMA, False)
        db.setconfig(sqlite3.SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION, False)
        db.execute("PRAGMA temp_store = MEMORY")
        db.execute("PRAGMA hard_heap_limit = 33554432")
        for table in payload["tables"]:
            # Names and literal types come from the strict reviewed task schema, never learner SQL.
            cols = ", ".join('"' + c["name"] + '" ' + c["type"] for c in table["columns"])
            db.execute('CREATE TABLE "' + table["name"] + '" (' + cols + ')')
            marks = ", ".join("?" for _ in table["columns"])
            db.executemany('INSERT INTO "' + table["name"] + '" VALUES (' + marks + ')', table["rows"])
        db.commit()
        db.execute("PRAGMA query_only = ON")
        for limit, value in [
            (sqlite3.SQLITE_LIMIT_LENGTH, 16000), (sqlite3.SQLITE_LIMIT_SQL_LENGTH, 64000),
            (sqlite3.SQLITE_LIMIT_COLUMN, 16), (sqlite3.SQLITE_LIMIT_EXPR_DEPTH, 40),
            (sqlite3.SQLITE_LIMIT_COMPOUND_SELECT, 12), (sqlite3.SQLITE_LIMIT_VDBE_OP, 25000),
            (sqlite3.SQLITE_LIMIT_FUNCTION_ARG, 12), (sqlite3.SQLITE_LIMIT_ATTACHED, 0),
            (sqlite3.SQLITE_LIMIT_LIKE_PATTERN_LENGTH, 200), (sqlite3.SQLITE_LIMIT_VARIABLE_NUMBER, 0),
            (sqlite3.SQLITE_LIMIT_TRIGGER_DEPTH, 0), (sqlite3.SQLITE_LIMIT_WORKER_THREADS, 0),
        ]:
            db.setlimit(limit, value)
        allowed = {t["name"]: {c["name"] for c in t["columns"]} for t in payload["tables"]}
        def authorise(action, first, second, database, _trigger):
            if action in (sqlite3.SQLITE_SELECT, sqlite3.SQLITE_RECURSIVE):
                return sqlite3.SQLITE_OK
            if action == sqlite3.SQLITE_READ and first in allowed and ((database == "main" and second in allowed[first]) or (database in ("main", None) and second == "")):
                return sqlite3.SQLITE_OK
            if action == sqlite3.SQLITE_FUNCTION and (second or "").lower() in FUNCTIONS:
                return sqlite3.SQLITE_OK
            return sqlite3.SQLITE_DENY
        db.set_authorizer(authorise)
        deadline = time.monotonic() + 0.65
        ticks = 0
        def progress():
            nonlocal ticks
            ticks += 1
            return 1 if ticks > 1000 or time.monotonic() > deadline else 0
        db.set_progress_handler(progress, 1000)
        cursor = db.execute(query)
        if cursor.description is None:
            return {"error": "query", "message": "Use a SELECT query that returns a table."}
        rows = cursor.fetchmany(201)
        if len(rows) > 200:
            return {"error": "limit", "message": "Your query returned more than 200 rows. Check the join or add the requested filter."}
        columns = [c[0] for c in cursor.description]
        if any(len(c) > 200 for c in columns):
            return {"error": "limit", "message": "Use shorter column aliases."}
        for row in rows:
            for value in row:
                if (isinstance(value, str) and len(value) > 2000) or isinstance(value, bytes) or (isinstance(value, (int, float)) and (not math.isfinite(value) or abs(value) > 1e15)):
                    return {"error": "limit", "message": "A result value is too large for this exercise."}
        return {"result": {"columns": columns, "rows": rows}}
    except (sqlite3.Error, MemoryError) as error:
        message = str(error)
        if isinstance(error, MemoryError) or any(s in message for s in ("interrupted", "out of memory", "too big", "too many")):
            return {"error": "limit", "message": "This query exceeded the practice limit. Check for a repeated join or an unbounded recursion."}
        if any(s in message for s in ("not authorized", "prohibited", "readonly", "not allowed", "no such function")):
            return {"error": "query", "message": "Use SELECT with the displayed tables and standard SQL functions. Database changes and external access are unavailable."}
        if "one statement" in message:
            return {"error": "query", "message": "Run one SELECT statement at a time."}
        return {"error": "query", "message": message[:250] or "SQLite could not run this query."}
    finally:
        db.close()

try:
    incoming = sys.stdin.buffer.read(131073)
    if len(incoming) > 131072:
        raise ValueError("input too large")
    result = run(json.loads(incoming))
    print(json.dumps(result, ensure_ascii=True, allow_nan=False))
except Exception:
    print(json.dumps({"error": "runtime", "message": "SQL practice could not start its isolated database."}))
