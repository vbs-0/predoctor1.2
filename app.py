import os
import json
import sqlite3
from flask import Flask, request, render_template, jsonify, session, redirect, url_for, flash
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import sys

# Add the project root to the path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import custom modules
from api.llm_service import GroqAPI
from models.predict import Predictor

# Initialize Flask app
app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable caching

# Initialize services
llm_api = GroqAPI()

# Setup SQLite database
def init_db():
    with sqlite3.connect('food_predictions.db') as conn:
        cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_name TEXT,
        food_data TEXT,
        prediction_results TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER NULL
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        user_message TEXT,
        bot_response TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER NULL
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feedback_text TEXT NOT NULL,
        user_id INTEGER NULL,
        username TEXT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS visitor_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_count INTEGER DEFAULT 0
    )
    ''')
    
    # Initialize visitor count if not exists
    cursor.execute('SELECT * FROM visitor_stats LIMIT 1')
    if not cursor.fetchone():
        cursor.execute('INSERT INTO visitor_stats (visit_count) VALUES (0)')
    
    conn.commit()

# Initialize database on startup
init_db()

# Load predictor (only when needed to avoid loading models at startup)
predictor = None
def get_predictor():
    global predictor
    if predictor is None:
        try:
            predictor = Predictor()
        except Exception as e:
            print(f"Error loading predictor: {str(e)}")
            return None
    return predictor

# Check if user is logged in
def is_logged_in():
    return 'user_id' in session

# Check if user is admin
def is_admin():
    return is_logged_in() and session.get('username') == 'Garuda'

# Routes
@app.route('/')
def index():
    # Increment visitor count
    increment_visitor_count()
    return render_template('index.html')

# Function to increment visitor count
def increment_visitor_count():
    try:
        # Check if this session has already been counted
        if session.get('visited_this_session'):
            print("Session already counted, not incrementing visitor count")
            return

        with sqlite3.connect('food_predictions.db') as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE visitor_stats SET visit_count = visit_count + 1 WHERE id = 1')
            conn.commit()
            # Mark this session as counted
            session['visited_this_session'] = True
            print("Incremented visitor count for a new session")

    except Exception as e:
        print(f"Error incrementing visitor count: {str(e)}")


# Route to get visitor count
@app.route('/visitor-count')
def visitor_count():
    try:
        with sqlite3.connect('food_predictions.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT visit_count FROM visitor_stats WHERE id = 1')
            count = cursor.fetchone()[0]
        return jsonify({'success': True, 'count': count})
    except Exception as e:
        print(f"Error getting visitor count: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Authentication routes
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({'error': 'All fields are required'}), 400
        
        # Hash password
        hashed_password = generate_password_hash(password)
        
        # Save user to database
        conn = sqlite3.connect('food_predictions.db')
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                (username, email, hashed_password)
            )
            conn.commit()
            
            # Get the user_id
            cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
            user_id = cursor.fetchone()[0]
            
            # Set session
            session['user_id'] = user_id
            session['username'] = username
            
            return jsonify({'success': True, 'message': 'Registration successful', 'username': username})
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Username or email already exists'}), 400
        '''
        finally:
            conn.close()'''
    
    except Exception as e:
        print(f"Error in registration: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    print("Login attempt")  # Debugging line
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Special admin check
        if username == 'Garuda' and password == 'garuda1432':
            # Admin login
            session['user_id'] = 0  # Special admin ID
            session['username'] = 'Garuda'
            session['is_admin'] = True
            return jsonify({'success': True, 'message': 'Admin login successful', 'username': 'Garuda', 'is_admin': True})
        
        # Regular user check
        with sqlite3.connect('food_predictions.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, password FROM users WHERE username = ?', (username,))
            user = cursor.fetchone()
        
        if user and check_password_hash(user[2], password):
            # Set session
            session['user_id'] = user[0]
            session['username'] = user[1]
            session['is_admin'] = False
            return jsonify({'success': True, 'message': 'Login successful', 'username': user[1]})
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
    
    except Exception as e:
        print(f"Error in login: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/check-auth', methods=['GET'])
def check_auth():
    if is_logged_in():
        return jsonify({
            'authenticated': True, 
            'username': session.get('username'),
            'is_admin': session.get('is_admin', False)
        })
    else:
        return jsonify({'authenticated': False})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get food name from the request
        data = request.json
        print(f"Received prediction request with data: {data}")
        
        food_name = data.get('food_name')
        quantity = data.get('quantity', 'Standard serving')
        
        if not food_name:
            return jsonify({'error': 'Food name is required'}), 400
        
        # Get food attributes from LLM and check for alerts
        print(f"Getting food attributes for: {food_name}, quantity: {quantity}")
        food_data = llm_api.get_food_attributes(food_name)
        
        # Check for alert in the response
        if 'alert' in food_data:
            return jsonify({'alert': food_data['alert']}), 400
            
        # Check if the item is non-edible
        if food_data.get('is_non_edible', False) or food_data.get('category') == 'None':
            # Return formatted data for non-edible items
            non_edible_response = {
                'food_data': {
                    'name': food_name,
                    'quantity': quantity,
                    'category': 'None',
                    'subcategory': 'None',
                    'processing_level': 'None',
                    'calories': 'Unknown',
                    'glycemic_index': 'Unknown',
                    'inflammatory_index': '1/10',
                    'allergens': 'None',
                    'is_non_edible': True
                },
                'non_edible_message': f"'{food_name}' is not a food item. Please enter a valid food name."
            }
            return jsonify(non_edible_response)
        
        food_data['quantity'] = quantity
        print(f"Retrieved food data: {food_data}")
        
        # Load predictor
        pred = get_predictor()
        if pred is None:
            return jsonify({'error': 'Failed to load the prediction model'}), 500
        
        # Make prediction
        print(f"Making prediction for food data")
        prediction_results = pred.predict(food_data)
        print(f"Prediction results: {prediction_results}")
        
        # Save prediction to database only if user is logged in
        user_id = session.get('user_id')
        if user_id:
            with sqlite3.connect('food_predictions.db') as conn:
                cursor = conn.cursor()
                print(f"User ID for this prediction: {user_id}")
                cursor.execute(
                    'INSERT INTO predictions (food_name, food_data, prediction_results, user_id) VALUES (?, ?, ?, ?)',
                    (food_name, json.dumps(food_data), json.dumps(prediction_results), user_id)
                )
                conn.commit()
                print(f"Saved prediction to database for user {user_id}")
        else:
            print("User not logged in, not saving prediction history")
        
        # Return results
        response_data = {
            'food_data': food_data,
            'prediction_results': prediction_results
        }
        print(f"Sending response: {response_data}")
        return jsonify(response_data)
    
    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        # Get message from request
        data = request.json
        print(f"Received chat request with data: {data}")
        
        message = data.get('message')
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Get user ID if logged in
        user_id = session.get('user_id')
        print(f"Chat for user_id: {user_id}")
        
        # Get or create session ID for chat (for non-logged in users)
        if 'chat_session_id' not in session:
            session['chat_session_id'] = os.urandom(16).hex()
        
        # Get chat history from the database
        with sqlite3.connect('food_predictions.db') as conn:
            cursor = conn.cursor()
            # If user is logged in, get their chat history, otherwise use session-based history
            if user_id:
                cursor.execute(
                    'SELECT user_message, bot_response FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC LIMIT 10',
                    (user_id,)
                )
            else:
                cursor.execute(
                    'SELECT user_message, bot_response FROM chat_history WHERE session_id = ? ORDER BY timestamp ASC LIMIT 10',
                    (session['chat_session_id'],)
                )
            history = cursor.fetchall()
        
        print(f"Retrieved {len(history)} chat history messages")
        
        # Format history for the API
        conversation_history = []
        for user_msg, bot_msg in history:
            conversation_history.append({"role": "user", "content": user_msg})
            conversation_history.append({"role": "assistant", "content": bot_msg})
        
        print(f"Formatted {len(conversation_history)} messages for context")
        
        # Get response from LLM with context
        response = llm_api.chat(message, conversation_history)
        
        # Save to database only if user is logged in
        if user_id:
            with sqlite3.connect('food_predictions.db') as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO chat_history (session_id, user_message, bot_response, user_id) VALUES (?, ?, ?, ?)',
                    (session['chat_session_id'], message, response, user_id)
                )
                conn.commit()
                print(f"Saved chat message to database for user {user_id}")
        else:
            print("User not logged in, not saving chat history")
            
        return jsonify({'response': response})
    
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['GET'])
def history():
    try:
        # Get user ID if logged in
        user_id = session.get('user_id')
        print(f"Fetching history for user_id: {user_id}")
        
        # Get predictions history
        with sqlite3.connect('food_predictions.db') as conn:
            cursor = conn.cursor()
            if user_id:
                # Get user-specific history if logged in
                cursor.execute(
                    'SELECT food_name, prediction_results, timestamp FROM predictions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10',
                    (user_id,)
                )
            else:
                # Get session-based history if not logged in
                cursor.execute(
                    'SELECT food_name, prediction_results, timestamp FROM predictions WHERE user_id IS NULL ORDER BY timestamp DESC LIMIT 10'
                )
            predictions = cursor.fetchall()
        print(f"Found {len(predictions)} prediction records")
        
        # Format the results
        prediction_history = []
        for food_name, results, timestamp in predictions:
            try:
                parsed_results = json.loads(results)
                prediction_history.append({
                    'food_name': food_name,
                    'results': parsed_results,
                    'timestamp': timestamp
                })
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON from database: {e}")
                continue
        
        print(f"Formatted {len(prediction_history)} history items")
        return jsonify({'history': prediction_history})
    
    except Exception as e:
        print(f"Error retrieving history: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/chat-history', methods=['GET'])
def chat_history():
    try:
        # Get user ID if logged in
        user_id = session.get('user_id')
        print(f"Fetching chat history for user_id: {user_id}")
        
        # Get chat history
        with sqlite3.connect('food_predictions.db') as conn:
            cursor = conn.cursor()
            if user_id:
                # Get user-specific chat history if logged in
                cursor.execute(
                    'SELECT user_message, bot_response, timestamp FROM chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20',
                    (user_id,)
                )
            else:
                # Get session-based chat history if not logged in
                cursor.execute(
                    'SELECT user_message, bot_response, timestamp FROM chat_history WHERE session_id = ? ORDER BY timestamp DESC LIMIT 20',
                    (session.get('chat_session_id', ''),)
                )
            history = cursor.fetchall()
        
        print(f"Found {len(history)} chat history records")
        
        # Format the results
        chat_history = []
        for user_msg, bot_msg, timestamp in history:
            chat_history.append({
                'user_message': user_msg,
                'bot_response': bot_msg,
                'timestamp': timestamp
            })
        
        print(f"Formatted {len(chat_history)} chat history items")
        return jsonify({'history': chat_history})
    
    except Exception as e:
        print(f"Error retrieving chat history: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/clear-predictions', methods=['POST'])
def clear_predictions():
    try:
        # Get user ID if logged in
        user_id = session.get('user_id')
        
        # Connect to database
        with sqlite3.connect('food_predictions.db') as conn:
            cursor = conn.cursor()
            if user_id:
                # Clear user-specific predictions if logged in
                cursor.execute('DELETE FROM predictions WHERE user_id = ?', (user_id,))
                print(f"Cleared predictions for user {user_id}")
            else:
                # Clear session-based predictions if not logged in
                cursor.execute('DELETE FROM predictions WHERE user_id IS NULL')
                print("Cleared predictions for non-logged in session")
            conn.commit()
        
        return jsonify({'success': True, 'message': 'Prediction history cleared'})
    
    except Exception as e:
        print(f"Error clearing predictions: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/clear-chats', methods=['POST'])
def clear_chats():
    try:
        # Get user ID if logged in
        user_id = session.get('user_id')
        
        # Connect to database
        with sqlite3.connect('food_predictions.db') as conn:
            cursor = conn.cursor()
            if user_id:
                # Clear user-specific chat history if logged in
                cursor.execute('DELETE FROM chat_history WHERE user_id = ?', (user_id,))
                print(f"Cleared chat history for user {user_id}")
            else:
                # Clear session-based chat history if not logged in
                session_id = session.get('chat_session_id', '')
                cursor.execute('DELETE FROM chat_history WHERE session_id = ?', (session_id,))
                print(f"Cleared chat history for session {session_id}")
            conn.commit()
        
        return jsonify({'success': True, 'message': 'Chat history cleared'})
    
    except Exception as e:
        print(f"Error clearing chat history: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Service worker route - ensures proper MIME type
@app.route('/service-worker.js')
def service_worker():
    response = app.send_static_file('service-worker.js')
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Service-Worker-Allowed'] = '/'
    return response

# Manifest route
@app.route('/manifest.json')
def manifest():
    response = app.send_static_file('manifest.json')
    response.headers['Content-Type'] = 'application/manifest+json'
    return response

# Add new route for AI explanations
@app.route('/explain-prediction', methods=['POST'])
def explain_prediction():
    try:
        data = request.json
        food_name = data.get('food_name', '')
        impacts = data.get('impacts', {})
        food_data = data.get('food_data', {})
        
        # Create a comprehensive prompt for the AI
        prompt = f"Explain why {food_name} would have the following impacts on menstrual symptoms:\n"
        for symptom, impact in impacts.items():
            prompt += f"- {symptom.capitalize()}: {impact}\n"
        
        # Add additional food data for better context
        prompt += "\nFood details:\n"
        if food_data:
            for key, value in food_data.items():
                if value and value != "Unknown":
                    prompt += f"- {key.replace('_', ' ').capitalize()}: {value}\n"
        
        prompt += "\nProvide 4-5 specific points that explain these impacts focusing on:\n"
        prompt += "1. Specific nutrients or compounds in this food that affect hormones or inflammation\n"
        prompt += "2. How the glycemic index or processing level might influence symptoms\n"
        prompt += "3. Scientific explanation of the biological mechanisms involved\n"
        prompt += "4. Why certain symptoms are more affected than others\n"
        prompt += "Make each point concise and focused on one specific aspect."
        
        # If you have OpenAI integration:
        try:
            import openai
            
            # Check if API key is configured
            if os.environ.get('OPENAI_API_KEY'):
                openai.api_key = os.environ.get('OPENAI_API_KEY')
                
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a nutritionist specializing in women's health and menstrual cycles. Provide scientifically accurate, concise explanations."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=500,
                    temperature=0.7
                )
                
                # Extract explanation points from the response
                explanation_text = response.choices[0].message['content'].strip()
                explanation_points = [p.strip() for p in explanation_text.split('\n') if p.strip() and not p.strip().startswith('-')]
                
                # Fallback to use bullet points if parsing fails
                if not explanation_points:
                    explanation_points = explanation_text.split('\n')
                
                return jsonify({"explanation": explanation_points})
        except Exception as e:
            print(f"OpenAI API error: {e}")
            # Fall back to simulated response
        
        # Simulated AI response if OpenAI is not available
        nutrients = {
            "fruits": ["vitamin C", "antioxidants", "natural sugars", "fiber"],
            "vegetables": ["fiber", "vitamins", "minerals", "phytonutrients"],
            "grains": ["complex carbohydrates", "fiber", "B vitamins"],
            "dairy": ["calcium", "protein", "fat", "vitamin D"],
            "meat": ["protein", "iron", "B12", "zinc"],
            "seafood": ["omega-3 fatty acids", "protein", "iodine"],
            "nuts": ["healthy fats", "protein", "vitamin E", "magnesium"],
            "legumes": ["protein", "fiber", "folate", "iron"],
            "processed": ["sodium", "trans fats", "preservatives", "refined sugars"],
            "sweets": ["refined sugars", "saturated fats", "artificial flavors"],
            "fats_oils": ["fatty acids", "omega-3", "omega-6", "vitamin E"],
            "spices": ["antioxidants", "anti-inflammatory compounds", "essential oils"]
        }
        
        beneficial_count = sum(1 for impact in impacts.values() if impact == "Beneficial")
        harmful_count = sum(1 for impact in impacts.values() if impact == "Harmful")
        
        # Determine food category (using provided data if available)
        food_category = "fruits"  # default
        if food_data and food_data.get('category') and food_data.get('category') != "Unknown":
            category_lower = food_data.get('category').lower()
            for category in nutrients.keys():
                if category.lower() in category_lower:
                    food_category = category
                    break
        else:
            # Fallback to food name matching
            for category in nutrients.keys():
                if category.lower() in food_name.lower():
                    food_category = category
                    break
        
        # Get processing level and glycemic data
        processing = "minimally processed"
        if food_data and food_data.get('processing') and food_data.get('processing') != "Unknown":
            processing = food_data.get('processing').lower()
        
        glycemic = "medium"
        if food_data and food_data.get('glycemic_index') and food_data.get('glycemic_index') != "Unknown":
            gi_text = food_data.get('glycemic_index').lower()
            if "high" in gi_text:
                glycemic = "high"
            elif "low" in gi_text:
                glycemic = "low"
        
        # Generate explanation points
        explanation = []
        
        # Point 1: General impact based on nutrients
        if beneficial_count > harmful_count:
            explanation.append(f"{food_name.capitalize()} contains nutrients that generally support hormonal balance during menstruation, including {nutrients[food_category][0]} and {nutrients[food_category][1]}.")
        else:
            explanation.append(f"{food_name.capitalize()} contains compounds that may trigger or worsen menstrual symptoms in some individuals, particularly due to its {nutrients[food_category][0]} and {nutrients[food_category][2]} content.")
        
        # Point 2: Processing level impact
        if "highly" in processing or "ultra" in processing:
            explanation.append(f"As a {processing} food, {food_name} may contain additives or altered nutrient profiles that can affect hormone balance and potentially trigger inflammation in sensitive individuals.")
        else:
            explanation.append(f"Being {processing}, {food_name} retains more of its natural nutrients that can help support the body during menstruation.")
        
        # Point 3: Glycemic impact explanation
        if glycemic == "high":
            explanation.append(f"The high glycemic index of {food_name} can cause rapid blood sugar fluctuations, which may worsen mood swings and fatigue during your cycle.")
        elif glycemic == "low":
            explanation.append(f"With a low glycemic index, {food_name} provides steady energy release that helps stabilize blood sugar and reduce mood swings commonly experienced during menstruation.")
        
        # Point 4: Specific symptom impact
        most_impacted = None
        for symptom, impact in impacts.items():
            if impact == "Beneficial" or impact == "Harmful":
                most_impacted = (symptom, impact)
                break
                
        if most_impacted:
            symptom, impact = most_impacted
            if impact == "Beneficial":
                explanation.append(f"The nutrients in {food_name} specifically target {symptom} by affecting prostaglandin production, which regulates pain and inflammation during menstruation.")
            else:
                explanation.append(f"{food_name.capitalize()} may worsen {symptom} due to compounds that can increase inflammation or fluid retention in susceptible individuals.")
        
        # Point 5: Individual variation
        explanation.append(f"Individual responses to {food_name} may vary based on personal sensitivities, overall diet composition, and the specific phase of your menstrual cycle when consumed.")
        
        return jsonify({"explanation": explanation})
        
    except Exception as e:
        print(f"Error in explain_prediction: {e}")
        return jsonify({"explanation": [
            f"Based on our analysis, {food_name} appears to affect menstrual symptoms through several biological mechanisms.",
            "Nutrient content and glycemic impact may influence hormone regulation and inflammation responses.",
            "The level of processing and presence of certain compounds can directly affect symptoms like bloating and cramps.",
            "Everyone responds differently to foods based on individual sensitivities and hormonal profiles."
        ]})

# Feedback route
@app.route('/submit-feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.json
        feedback_text = data.get('feedback_text')
        
        if not feedback_text:
            return jsonify({'error': 'Feedback text is required'}), 400
        
        # Get user info if logged in
        user_id = session.get('user_id')
        username = session.get('username')
        
        # Save feedback to database
        with sqlite3.connect('food_predictions.db') as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO feedbacks (feedback_text, user_id, username) VALUES (?, ?, ?)',
                (feedback_text, user_id, username)
            )
            conn.commit()
            # Also append to feedbacks.txt file
            with open('feedbacks.txt', 'a') as f:
                f.write(f"User: {username or 'Anonymous'}, Time: {cursor.execute('SELECT datetime()').fetchone()[0]}\n")
                f.write(f"Feedback: {feedback_text}\n")
                f.write("-" * 50 + "\n")
        return jsonify({'success': True, 'message': 'Feedback submitted successfully'})
    
    except Exception as e:
        print(f"Error submitting feedback: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Admin routes
@app.route('/admin/feedbacks', methods=['GET'])
def admin_feedbacks():
    if not is_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        with sqlite3.connect('food_predictions.db') as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM feedbacks ORDER BY timestamp DESC')
            feedbacks = [dict(row) for row in cursor.fetchall()]
        return jsonify({'success': True, 'feedbacks': feedbacks})
    
    except Exception as e:
        print(f"Error fetching feedbacks: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/admin/set-notification', methods=['POST'])
def admin_set_notification():
    if not is_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        data = request.json
        message = data.get('message')
        is_active = data.get('is_active', True)
        
        if message is None:
            return jsonify({'error': 'Message is required'}), 400
        
        with sqlite3.connect('food_predictions.db') as conn:
            cursor = conn.cursor()
            # Deactivate all previous notifications
            cursor.execute('UPDATE notifications SET is_active = FALSE')
            # Add new notification if message is provided
            if message:
                cursor.execute(
                    'INSERT INTO notifications (message, is_active) VALUES (?, ?)',
                    (message, is_active)
                )
            conn.commit()
        return jsonify({'success': True, 'message': 'Notification updated successfully'})
    
    except Exception as e:
        print(f"Error setting notification: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get-active-notification', methods=['GET'])
def get_active_notification():
    try:
        with sqlite3.connect('food_predictions.db') as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM notifications WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1')
            notification = cursor.fetchone()
        if notification:
            return jsonify({'success': True, 'notification': dict(notification)})
        else:
            return jsonify({'success': True, 'notification': None})
    
    except Exception as e:
        print(f"Error fetching notification: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)
