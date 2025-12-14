from flask import Flask, render_template_string, request, session, redirect, url_for
import math
import secrets
import os
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))

magic_links = {}

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kalkulator Lingkaran</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
        }
        h1 {
            color: #667eea;
            margin-bottom: 10px;
            text-align: center;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
        }
        input[type="number"], input[type="email"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="number"]:focus, input[type="email"]:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
        }
        .result {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .result h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        .result-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .result-item:last-child {
            border-bottom: none;
        }
        .result-label {
            font-weight: 600;
            color: #555;
        }
        .result-value {
            color: #667eea;
            font-weight: 700;
        }
        .logout {
            margin-top: 20px;
            text-align: center;
        }
        .logout a {
            color: #667eea;
            text-decoration: none;
            font-size: 14px;
        }
        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        {% if not logged_in %}
        <h1>🔐 Login</h1>
        <p class="subtitle">Masukkan email untuk mendapatkan magic link</p>
        {% if message %}
        <div class="message {{ message_type }}">{{ message }}</div>
        {% endif %}
        <form method="POST" action="/login">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="nama@example.com">
            </div>
            <button type="submit">Kirim Magic Link</button>
        </form>
        {% else %}
        <h1>⭕ Kalkulator Lingkaran</h1>
        <p class="subtitle">Hitung luas dan keliling lingkaran dengan mudah</p>
        <form method="POST" action="/calculate">
            <div class="form-group">
                <label for="radius">Jari-jari (r)</label>
                <input type="number" step="0.01" id="radius" name="radius" required placeholder="Masukkan jari-jari">
            </div>
            <button type="submit">Hitung</button>
        </form>
        
        {% if result %}
        <div class="result">
            <h3>📊 Hasil Perhitungan</h3>
            <div class="result-item">
                <span class="result-label">Jari-jari (r)</span>
                <span class="result-value">{{ result.radius }} cm</span>
            </div>
            <div class="result-item">
                <span class="result-label">Diameter (d)</span>
                <span class="result-value">{{ result.diameter }} cm</span>
            </div>
            <div class="result-item">
                <span class="result-label">Keliling (K)</span>
                <span class="result-value">{{ result.keliling }} cm</span>
            </div>
            <div class="result-item">
                <span class="result-label">Luas (L)</span>
                <span class="result-value">{{ result.luas }} cm²</span>
            </div>
        </div>
        {% endif %}
        
        <div class="logout">
            <a href="/logout">Logout</a>
        </div>
        {% endif %}
    </div>
</body>
</html>
"""

@app.route('/')
def index():
    logged_in = session.get('authenticated', False)
    return render_template_string(HTML_TEMPLATE, logged_in=logged_in)

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    token = secrets.token_urlsafe(32)
    magic_links[token] = {
        'email': email,
        'expires': datetime.now() + timedelta(minutes=15)
    }
    
    magic_link = f"{request.url_root}auth?token={token}"
    
    print(f"\n{'='*60}")
    print(f"Magic Link untuk {email}:")
    print(magic_link)
    print(f"{'='*60}\n")
    
    return render_template_string(
        HTML_TEMPLATE, 
        logged_in=False, 
        message=f"Magic link telah dibuat! (Dalam production, ini akan dikirim ke email Anda. Untuk demo, cek console/logs)",
        message_type="success"
    )

@app.route('/auth')
def auth():
    token = request.args.get('token')
    
    if token not in magic_links:
        return render_template_string(
            HTML_TEMPLATE, 
            logged_in=False, 
            message="Link tidak valid atau sudah kadaluarsa",
            message_type="error"
        )
    
    link_data = magic_links[token]
    
    if datetime.now() > link_data['expires']:
        del magic_links[token]
        return render_template_string(
            HTML_TEMPLATE, 
            logged_in=False, 
            message="Link sudah kadaluarsa",
            message_type="error"
        )
    
    session['authenticated'] = True
    session['email'] = link_data['email']
    del magic_links[token]
    
    return redirect(url_for('index'))

@app.route('/calculate', methods=['POST'])
def calculate():
    if not session.get('authenticated'):
        return redirect(url_for('index'))
    
    radius = float(request.form.get('radius'))
    
    luas = math.pi * radius ** 2
    keliling = 2 * math.pi * radius
    diameter = 2 * radius
    
    result = {
        'radius': round(radius, 2),
        'diameter': round(diameter, 2),
        'luas': round(luas, 2),
        'keliling': round(keliling, 2)
    }
    
    return render_template_string(HTML_TEMPLATE, logged_in=True, result=result)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
