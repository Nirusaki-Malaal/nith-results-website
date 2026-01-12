from flask import Flask, jsonify
from pymongo import MongoClient
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
url = os.environ["MONGO_URL"]
client = MongoClient(url, maxPoolSize=100)
db = client["results"]
all_docs = []


def fetch_collection(col_name="all"):
    return list(db[col_name].find({"student_info.roll_number": {"$nin": ["", None]}}, {"_id": 0}))


@app.route("/documents", methods=["GET"])
def send_documents():
    return jsonify(all_docs)
@app.route("/")
def health():
    return "Backend running 🚀"

if __name__ == "__main__":
    all_docs = fetch_collection()
    print("FETCHED")
    app.run(debug=True)



