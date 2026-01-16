from flask import Flask, jsonify, render_template
from pymongo import MongoClient
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
url = os.environ["MONGO_URL"]
client = MongoClient(url, maxPoolSize=100)
db = client["results"]

def fetch_collection(col_name="all"):
    return list(db[col_name].find({"student_info.roll_number": {"$nin": ["", None]}}, {"_id": 0}))
all_docs = fetch_collection()
print("FETCHED")

@app.route("/documents", methods=["GET"])
def send_documents():
    return jsonify(all_docs)

    
@app.route("/")
def home():
    name = "Mradul"
    return render_template("index.html", username=name)




