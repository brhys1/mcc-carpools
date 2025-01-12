from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from google.oauth2 import service_account
from googleapiclient.discovery import build
import pandas as pd
from flask_cors import CORS
import googlemaps
from flask_migrate import Migrate
from dotenv import load_dotenv
import os
import base64

load_dotenv()

app = Flask(__name__)
CORS(app)

credentials_base64 = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_BASE64")
if credentials_base64:
    with open("mcc-carpools-credentials.json", "wb") as f:
        f.write(base64.b64decode(credentials_base64))
GOOGLE_APPLICATION_CREDENTIALS = "mcc-carpools-credentials.json"
# Initialize Google Maps Client
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("SQLALCHEMY_DATABASE_URI")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

migrate = Migrate(app, db)
# Path to your service account key file
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
    
# Spreadsheet details
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID")
RANGE_NAME = 'Sheet1!A3:C'  # Fetches all rows from A3 to the last row in C

class Driver(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    region = db.Column(db.JSON(100), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    drives = db.Column(db.JSON, nullable=False)

    def __repr__(self):
        return f'<Driver {self.name}>'
    

class Rider(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(100), nullable=False)
    availability = db.Column(db.JSON, nullable=False)
    divisions = db.Column(db.JSON, nullable=False)

    def __repr__(self):
        return f'<Rider {self.name}>'

with app.app_context():
    db.create_all()

def validate_address(address):
    try:
        geocode_result = gmaps.geocode(address)
        if geocode_result and len(geocode_result) > 0:
            location = geocode_result[0]['geometry']['location']
            return True, location['lat'], location['lng']  # Return lat and lng
        else:
            return False, None, None
    except Exception as e:
        print(f"Geocoding error: {e}")
        return False, None, None
 
def get_region(address, lat, long):
    region = []

    # Kerrytown
    if 42.279277 <= lat <= 42.286811 and -83.747954 <= long <= -83.733047:
        region.append('kerrytown')

    # Central
    if 42.271742 <= lat <= 42.279677 and -83.747954 <= long <= -83.733047:
        region.append('central')

    # The Hill
    if 42.274770 <= lat <= 42.286811 and -83.733447 <= long <= -83.722809:
        region.append('hill')

    # Lower Burns Park
    if 42.264330 <= lat <= 42.272142 and -83.747954 <= long <= -83.733047:
        region.append('lower_bp')

    # Upper Burns Park
    if 42.264330 <= lat <= 42.275170 and -83.733447 <= long <= -83.722809:
        region.append('upper_bp')

    if 'pierpont' in str(address).lower():
        region.append('pierpont')

    return region if region else 'Unknown'


#def new_driver_match(data, regions):
    
    



def get_google_sheets_data():
    creds = service_account.Credentials.from_service_account_file(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS"), scopes=SCOPES
    )

    service = build('sheets', 'v4', credentials=creds)
    sheet = service.spreadsheets()

    result = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME).execute()
    values = result.get('values', [])
    return values


@app.route('/api/sheets', methods=['GET'])
def fetch_sheets_data():
    try:
        data = get_google_sheets_data()
        return jsonify({'data': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/drivers', methods=['GET'])
def get_drivers():
    drivers = Driver.query.all()
    results = [
        {
            "id": driver.id,
            "name": driver.name,
            "email" : driver.email,
            "region" : driver.region,
            "address": driver.address,
            "drives": driver.drives
        } for driver in drivers
    ]
    return results
    
@app.route('/api/drivers', methods=['POST'])
def add_driver():
    try:
        data = request.get_json()
        name = data['name']
        email = data['email']
        address = data['address']
        drives = data['drives']

        is_valid, lat, lng = validate_address(address)
        if not is_valid:
            return jsonify({'error': 'Invalid address!'}), 400
        
        region = get_region(address, lat, lng)

        if 'Unknown' in region:
            return jsonify({'error': 'Invalid address!'}), 400
        
        #new_driver_match(data, region)
        
        new_driver = Driver(name=name, email=email, address=address, region=region, drives=drives)
        db.session.add(new_driver)
        db.session.commit()


        return jsonify({'message': 'Driver added successfully!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    

@app.route('/api/riders', methods=['GET'])
def get_riders():
    riders = Rider.query.all()  # Fetch all rows in the Driver table
    results = [
        {
            "id": rider.id,
            "name": rider.name,
            "email" : rider.email,
            "availability": rider.availability,
            "divisions": rider.divisions,
        } for rider in riders
    ]
    return results
    
@app.route('/api/riders', methods=['POST'])
def add_rider():
    try:
        data = request.get_json()
        name = data['name']
        email = data['email']
        availability = data['availability']
        divisions = data['divisions']

        # Check for duplicate entries
        existing_rider = Rider.query.filter_by(name=name).first()
        if existing_rider:
            return jsonify({'error': 'Rider already exists'}), 400

        # Save new rider
        new_rider = Rider(name=name, email=email, availability=availability, divisions=divisions)
        db.session.add(new_rider)
        db.session.commit()

        return jsonify({'message': 'Rider added successfully!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)

