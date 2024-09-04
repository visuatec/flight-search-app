from flask import Flask
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()


def create_app():
    # Initialize the Flask application
    app = Flask(__name__)

    # Set configuration variables (if any) here, for example:
    # app.config['DEBUG'] = True

    # Import the main blueprint from routes.py
    from .routes import main

    # Register the blueprint
    app.register_blueprint(main)

    # Return the Flask app instance
    return app
