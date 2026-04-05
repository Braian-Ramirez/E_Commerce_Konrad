import urllib.request
import json
import sqlite3

# Let's read the error directly from Django API response
url = "http://127.0.0.1:8000/api/v1/products/comentarios/"
data = json.dumps({
    "producto": 1,
    "comentario": "xsdf",
    "calificacion": 10
}).encode("utf-8")

req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
try:
    response = urllib.request.urlopen(req)
    print("SUCCESS", response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("ERROR", e.code, e.read().decode("utf-8"))
