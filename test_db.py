import sqlite3
conn = sqlite3.connect('db.sqlite3')
c = conn.cursor()
c.execute("SELECT id, nombre FROM products_producto")
print(c.fetchall())
