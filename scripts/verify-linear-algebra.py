"""Independent numerical audit of original Discere linear-algebra problems."""
import json, math, pathlib, sys, datetime
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
manifest_path = ROOT / "content/linear-algebra-vectors-and-maps/authoring/numeric-verification.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
def array(v):
    return np.asarray(v, dtype=float)
def project(v, d):
    v, d = array(v), array(d)
    return (v @ d)/(d @ d)*d
def model_value(m):
    kind = m["kind"]
    if kind == "vector_sum":
        return array(m["u"])+array(m["v"])
    if kind == "scaled_vector":
        return array(m["v"])*m["scale"]
    if kind == "dot_product":
        return array(m["u"]) @ array(m["v"])
    if kind == "vector_length":
        return np.linalg.norm(array(m["v"]))
    if kind == "projection":
        return project(m["v"], m["direction"])
    if kind == "span":
        return np.linalg.matrix_rank(array(m["vectors"]).T)
    if kind == "eigen":
        v = array(m["vector"])
        out = array(m["matrix"]) @ v
        i = np.flatnonzero(v)[0]
        value = out[i]/v[i]
        if not np.allclose(out, value*v, atol=1e-10, rtol=1e-10):
            raise ValueError("The candidate is not an eigenvector")
        return value
    if kind == "svd":
        return np.linalg.svd(array(m["matrix"]), compute_uv=False)
    if kind == "system":
        return np.linalg.solve(array(m["matrix"]), array(m["rhs"]))
    if kind == "least_squares":
        return np.linalg.lstsq(array(m["matrix"]), array(m["rhs"]), rcond=None)[0]
    if kind == "matrix":
        a, operation = array(m["matrix"]), m["operation"]
        if operation == "transpose": return a.T
        if operation == "apply": return a @ array(m["vector"])
        if operation == "multiply": return a @ array(m["second"])
        if operation == "inverse": return np.linalg.inv(a)
        if operation == "determinant": return np.linalg.det(a)
    raise ValueError("Unknown model: "+kind)
def evaluate(p):
    op = p["op"]
    if op == "model":
        result = model_value(p["model"])
        if "select" in p:
            index = tuple(p["select"]) if isinstance(p["select"], list) else p["select"]
            result = result[index]
        return float(result)
    if op == "shape":
        a = array(p["matrix"])
        return float((a.T if p.get("transpose") else a).shape[p["axis"]])
    if op == "normalize":
        v = array(p["v"])
        return float((v/np.linalg.norm(v))[p["index"]])
    if op == "row_operation":
        a = array(p["matrix"])
        return float((a[p["target"]]-p["factor"]*a[p["source"]])[p["index"]])
    if op == "rank":
        return float(np.linalg.matrix_rank(array(p["matrix"])))
    if op == "nullity":
        a = array(p["matrix"])
        return float(a.shape[1]-np.linalg.matrix_rank(a))
    if op == "absolute_determinant":
        return float(abs(np.linalg.det(array(p["matrix"]))))
    if op == "product_determinant":
        return float(np.linalg.det(array(p["matrix"]) @ array(p["second"])))
    if op == "residual":
        return float((array(p["v"])-project(p["v"], p["direction"]))[p["index"]])
    if op.startswith("least_squares"):
        a, b = array(p["matrix"]), array(p["rhs"])
        solution = np.linalg.lstsq(a, b, rcond=None)[0]
        if op == "least_squares": return float(solution[p["index"]])
        residual = b-a @ solution
        if op == "least_squares_residual_sum": return float(residual.sum())
        if op == "least_squares_sse": return float(residual @ residual)
    if op == "eigen_power":
        a, v = array(p["matrix"]), array(p["vector"])
        i = np.flatnonzero(v)[0]
        out = np.linalg.matrix_power(a, p["power"]) @ v
        factor = out[i]/v[i]
        if not np.allclose(out, factor*v):
            raise ValueError("The powered output is not a scalar multiple")
        return float(factor)
    if op == "diagonal_reconstruct":
        basis = array(p["basis"])
        a = basis @ np.diag(p["values"]) @ np.linalg.inv(basis)
        return float(a[p["row"], p["column"]])
    raise ValueError("Unknown probe: "+op)
ids = [c["id"] for c in manifest["checks"]]
if len(set(ids)) != len(ids):
    raise ValueError("Duplicate verification identities")
results = []
for c in manifest["checks"]:
    calculated = evaluate(c["probe"])
    error = abs(calculated-c["value"])
    if not math.isfinite(calculated) or error > 1e-9:
        raise AssertionError(f"{c['id']}: expected {c['value']}, NumPy calculated {calculated}")
    results.append({"id":c["id"],"kind":c["kind"],"expected":c["value"],"independentValue":calculated,"absoluteError":error})
report = {"schemaVersion":1,"courseId":manifest["courseId"],"bundleSha256":manifest["bundleSha256"],"auditedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"implementation":"Independent CPython/NumPy; no Discere math-engine import","pythonVersion":sys.version.split()[0],"numpyVersion":np.__version__,"passed":True,"counts":{k:sum(c["kind"] == k for c in results) for k in ("question","recall","course_check")},"maxAbsoluteError":max(c["absoluteError"] for c in results),"results":results}
output = ROOT / "docs/library-expansion/linear-algebra-numeric-audit.json"
output.write_text(json.dumps(report, indent=2)+"\n",encoding="utf-8")
print(json.dumps({k:v for k,v in report.items() if k != "results"},indent=2))
