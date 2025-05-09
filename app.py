from flask import Flask, render_template, redirect, url_for

app = Flask(__name__)

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/journal')
def journal():
    return render_template('journal.html')

if __name__ == '__main__':
    app.run(debug=True)
