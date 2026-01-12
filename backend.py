from flask import Flask, jsonify
from pymongo import MongoClient
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
url = 'mongodb+srv://nirusaki:nirusaki@cluster0.rrdouxd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
client = MongoClient(url, maxPoolSize=100)
db = client["results"]
all_docs = []


def fetch_collection(col_name="all"):
    return list(db[col_name].find({"student_info.roll_number": {"$nin": ["", None]}}, {"_id": 0}))


@app.route("/documents", methods=["GET"])
def send_documents():
    return jsonify(all_docs)

if __name__ == "__main__":
    all_docs = fetch_collection()
    print("FETCHED")
    app.run(debug=True)
