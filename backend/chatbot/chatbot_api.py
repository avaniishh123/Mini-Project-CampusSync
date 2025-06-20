from flask import Flask, request, jsonify, render_template
from chatbot import ask_faq

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("chat.html")

@app.route("/api/chat", methods=["POST"])
def chat():
    user_message = request.json["message"]
    response = ask_faq(user_message)
    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(debug=True)
