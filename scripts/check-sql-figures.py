"""Runs every relational_query figure's SQL in SQLite and compares it with the result the figure
shows: python3 -I scripts/check-sql-figures.py <course-id> [<course-id> ...]. A figure that runs
several statements, or relies on a key the input tables do not declare, is reported and has to
be checked by hand."""
import json, sqlite3, sys
def walk(o):
    if isinstance(o, dict):
        if o.get("type") == "relational_query": yield o
        for v in o.values(): yield from walk(v)
    elif isinstance(o, list):
        for v in o: yield from walk(v)
bad = 0
for course in sys.argv[1:]:
    b = json.load(open(f"content/{course}/bundle.json"))
    for lesson in b["lessons"]:
        for d in walk(lesson):
            for q in d["queries"]:
                c = sqlite3.connect(":memory:")
                for t in d["inputs"]:
                    cols = ", ".join(f'"{x}"' for x in t["columns"])
                    c.execute(f'CREATE TABLE "{t["name"]}" ({cols})')
                    for r in t["rows"]:
                        c.execute(f'INSERT INTO "{t["name"]}" VALUES ({",".join("?"*len(r["cells"]))})', r["cells"])
                try:
                    got = [list(r) for r in c.execute(q["sql"]).fetchall()]
                except Exception as e:
                    got = f"ERROR {e}"
                want = [r["cells"] for r in q["result"]["rows"]]
                norm = lambda rows: rows if isinstance(rows, str) else [[float(x) if isinstance(x,(int,float)) and not isinstance(x,bool) else x for x in r] for r in rows]
                if norm(got) != norm(want):
                    bad += 1
                    print(f"MISMATCH {course}/{lesson['id']} {q['id']}\n  sql: {q['sql']!r}\n  want: {want}\n  got:  {got}")
                else:
                    print(f"ok {course}/{lesson['id']} {q['id']}")
print("mismatches:", bad)
