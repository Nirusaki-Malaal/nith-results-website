from flask import Flask, jsonify, render_template, send_from_directory, Response
from pymongo import MongoClient
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
url = "mongodb+srv://nirusaki:nirusaki@cluster0.rrdouxd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(url, maxPoolSize=100)
db = client["results"]

def fetch_collection(col_name="all"):
    return list(db[col_name].find({"student_info.roll_number": {"$nin": ["", None]}}, {"_id": 0}))
all_docs = fetch_collection()

@app.route("/documents", methods=["GET"])
def send_documents():
    return jsonify(all_docs)

@app.route("/")
def home():
    name = "nirusaki"
    return render_template("index.html", username=name)

# SEO Routes
@app.route("/robots.txt")
def robots():
    return send_from_directory('static', 'robots.txt', mimetype='text/plain')

@app.route("/sitemap.xml")
def sitemap():
    return send_from_directory('static', 'sitemap.xml', mimetype='application/xml')

# Redirect old URLs if any
@app.route("/results")
@app.route("/result")
def results_redirect():
    return home()

if __name__ == "__main__":
    fetch_collection()
    app.run(host="0.0.0.0", port=8001)






