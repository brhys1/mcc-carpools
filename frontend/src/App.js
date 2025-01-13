import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import dayjs from 'dayjs';

function Home() {
  const navigate = useNavigate();

  const handleRiderClick = () => {
    navigate('/riders');
  };

  const handleDriverClick = () => {
    navigate('/drivers');
  };

  return (
    <div>
      <h1>MCC Carpools Website</h1>
      <button onClick={handleRiderClick}>I am a Rider</button>
      <button onClick={handleDriverClick} style={{ marginLeft: '10px' }}>I am a Driver</button>
    </div>
  );
}

function Riders() {
  const [data, setData] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [email, setEmail] = useState('');
  const [availability, setAvailability] = useState(() => {
    const today = dayjs();
    const startOfNextWeek = today.day() === 0 ? today.add(1, 'day') : today.add(8 - today.day(), 'day');
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => startOfNextWeek.add(i, 'day').format('dddd, MM/DD/YY'));
    
    return daysOfWeek.reduce((acc, day) => {
      acc[day.toLowerCase()] = [];
      return acc;
    }, {});
  });
  const [divisions, setDivisions] = useState({
    kerrytown: false,
    central: false,
    hill: false,
    lower_bp: false,
    upper_bp: false,
    pierpont: false,
  });

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/sheets')
      .then(response => {
        const names = response.data.data.map(item => {
          const name = `${item["First Name"]} ${item["Last Name"]}`;
          const email = item.Uniqname ? `${item.Uniqname}@umich.edu` : '';
          return { name, email };
        });
        setData(names);
      })
      .catch(error => console.error('Error:', error));
  }, []);
  

  const handleDivisionChange = (event) => {
    setDivisions({ ...divisions, [event.target.name]: event.target.checked });
  };

  const handleSubmit = () => {
    if (!selectedName) {
      alert('Name is required.');
      return;
    }

    if (!email) {
      alert('Email is required.');
      return;
    }    
    
    const formattedAvailability = {};
  
    Object.keys(availability).forEach(day => {
      formattedAvailability[day] = availability[day].map(slot => ({
        start: slot.start ? slot.start.format('HH:mm A') : null, // Format time only
        end: slot.end ? slot.end.format('HH:mm A') : null,
        driver: null       // Format time only
      }));
    });
  
    const riderData = { name: selectedName, email, availability: formattedAvailability, divisions };

    console.log('Submitting Rider Data:', JSON.stringify(riderData, null, 2));

    axios.post('http://127.0.0.1:5000/api/riders', riderData)
      .then(response => {
        console.log(response.data);
        alert('Rider saved successfully!');
      })
      .catch(error => {
        console.error('Error saving rider:', error);
        alert('Failed to save rider.');
      });
  };

  const handleTimeChange = (day, index, type, value) => {
    const updatedAvailability = { ...availability };
    updatedAvailability[day][index][type] = value;
    setAvailability(updatedAvailability);
  };

  const addTimeSlot = (day) => {
    setAvailability(prev => ({
      ...prev,
      [day]: [...prev[day], { start: null, end: null }],
    }));
  };

  const deleteTimeSlot = (day, index) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div>
        <h1>MCC Carpools - Riders</h1>
        <p>Welcome riders to the new MCC Carpools Website! We hope you enjoy the new website<br></br>
        Anytime throughout the week you can put in your availability for next week but you must be a member the MCC. If you have paid dues but still don't see your name, fill out this form:<br></br>
        <p><a href='https://docs.google.com/forms/d/e/1FAIpQLSd-BmXMTGXi0ZoZXD_sVy5qMzrHDNYPqMfcn67_kS9FBZe1mg/viewform'>Join MCC</a></p>
        You will recieve an email when you have been paired with a car. This email will also provide you with the address to be picked up at. <br></br>
        You can select pick up in different regions of Ann Arbor. The goal is to get more drivers and in turn, more carpools!<br></br>
        Happy Climbing!
        </p>
        <Autocomplete
          options={data.map(item => item.name)}
          value={selectedName}
          onChange={(event, newValue) => {
            const selected = data.find(item => item.name === newValue);
            setSelectedName(newValue);
            setEmail(selected ? selected.email : '');
          }}
          renderInput={(params) => (
            <TextField {...params} label="Select a name" variant="outlined" />
          )}
        />
        <TextField
          label="Email"
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginTop: '10px', marginBottom: '20px', display: 'block' }}
        />
        {Object.keys(availability).map(day => (
          <div key={day} style={{ marginBottom: '10px' }}>
            <h3>{day.charAt(0).toUpperCase() + day.slice(1)}</h3>
            {availability[day].map((slot, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <TimePicker
                  label="Start Time"
                  value={slot.start}
                  onChange={(newValue) => handleTimeChange(day, index, 'start', newValue)}
                  renderInput={(params) => <TextField {...params} />}
                />
                <TimePicker
                  label="End Time"
                  value={slot.end}
                  onChange={(newValue) => handleTimeChange(day, index, 'end', newValue)}
                  renderInput={(params) => <TextField {...params} />}
                />
                <button onClick={() => deleteTimeSlot(day, index)}>Delete</button>
              </div>
            ))}
            <button onClick={() => addTimeSlot(day)}>Add Time Slot</button>
          </div>
        ))}
        <div>
          <h3>Select the areas you are willing to get picked up from</h3>
          <p>Note: the more areas you select the more likely you are to be paired because you will be paired with drivers who are leaving from an area you are willing to be picked up</p>
        </div>
        <img 
          src="/pics/divisions.png" 
          alt="Central Campus Divisions" 
          style={{ width: '100%', maxWidth: '600px', marginBottom: '10px' }} 
        />

        <FormGroup>
          <h3>Select Divisions:</h3>
          <FormControlLabel
            control={<Checkbox checked={divisions.kerrytown} onChange={handleDivisionChange} name="kerrytown" />}
            label="Kerrytown"
          />
          <FormControlLabel
            control={<Checkbox checked={divisions.central} onChange={handleDivisionChange} name="central" />}
            label="Central Campus"
          />
          <FormControlLabel
            control={<Checkbox checked={divisions.hill} onChange={handleDivisionChange} name="hill" />}
            label="The Hill"
          />
          <FormControlLabel
            control={<Checkbox checked={divisions.lower_bp} onChange={handleDivisionChange} name="lower_bp" />}
            label="Lower Burns Park"
          />
          <FormControlLabel
            control={<Checkbox checked={divisions.upper_bp} onChange={handleDivisionChange} name="upper_bp" />}
            label="Upper Burns Park"
          />
          <FormControlLabel
            control={<Checkbox checked={divisions.pierpont} onChange={handleDivisionChange} name="pierpont" />}
            label="Pierpont"
          />
        </FormGroup>
        <button onClick={handleSubmit} style={{ marginTop: '10px' }}>Submit</button>
      </div>
    </LocalizationProvider>
  );
}



function Drivers() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('')
  const [driveDetails, setDriveDetails] = useState([]);
  

  const handleAddDrive = () => {
    setDriveDetails([...driveDetails, { date: null, start: null, end: null }]);
  };

  const handleDeleteDrive = (index) => {
    const updatedDrives = driveDetails.filter((_, i) => i !== index);
    setDriveDetails(updatedDrives);
  };

  const handleDriveChange = (index, field, value) => {
    const updatedDrives = [...driveDetails];
    updatedDrives[index][field] = value;
    setDriveDetails(updatedDrives);
  };

  const handleSubmit = () => {
    const driverData = { 
      name, 
      email,
      address, 
      drives: driveDetails.map(drive => {
        const formattedDate = drive.date ? drive.date.format('dddd, MM/DD/YY') : null;
        return {
          [formattedDate]: [{
            start: drive.start ? drive.start.format('HH:mm A') : null,
            end: drive.end ? drive.end.format('HH:mm A') : null,
            capacity : capacity ? capacity: null
          }]
        };
      })
    };

    console.log(driverData);

    axios.post('http://127.0.0.1:5000/api/drivers', driverData)
      .then(response => {
        console.log(response.data);
        alert('Driver saved successfully!');
      })
      .catch(error => {
        console.error('Error saving driver:', error);
        alert('Failed to save driver.');
      });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div>
        <h1>MCC Carpools - Drivers</h1>
        <p>Welcome drivers to the new MCC Carpools Website!<br></br>
          Our goal with this is to make the carpool system work better for the drivers.<br></br>
          Enter your name, email, and the pick up address. <br></br>
          In this system, the pick up address can be anywhere on central campus (full map is on the rider page). <br></br>
          This means you can just leave from your house :). <br></br>
          North campus is still at pierpont but we would love to hear feedback if this is the best system.<br></br>
          One last thing. Everytime you drive, you get an extra entry into a pool from which we will be giving away an REI gift card each month!
        </p>
        <TextField
          label="Name"
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginBottom: '10px', display: 'block' }}
        />
        <TextField
          label="Email"
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginTop: '10px', marginBottom: '10px', display: 'block' }}
        />
        <TextField
          label="Car Capcity"
          variant="outlined"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          style={{ marginTop: '10px', marginBottom: '10px', display: 'block' }}
        />
        <TextField
          label="Pickup Address"
          variant="outlined"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ marginBottom: '10px', display: 'block' }}
        />
        <p>Note: if picking up on North Campus, just enter 'Pierpont Commons.'</p>
        {driveDetails.map((drive, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <DatePicker
              label="Drive Date"
              value={drive.date}
              onChange={(newValue) => handleDriveChange(index, 'date', newValue)}
              renderInput={(params) => <TextField {...params} />}
              disablePast
              maxDate={dayjs().add(7, 'day')}
            />
            <TimePicker
              label="Start Time"
              value={drive.start}
              onChange={(newValue) => handleDriveChange(index, 'start', newValue)}
              renderInput={(params) => <TextField {...params} />}
            />
            <TimePicker
              label="End Time"
              value={drive.end}
              onChange={(newValue) => handleDriveChange(index, 'end', newValue)}
              renderInput={(params) => <TextField {...params} />}
              minTime={drive.start}
            />
            <button onClick={() => handleDeleteDrive(index)} style={{ marginLeft: '10px' }}>Delete</button>
          </div>
        ))}
        <button onClick={handleAddDrive} style={{ marginTop: '10px' }}>Add Drive Time</button>
        <div></div>
        <button onClick={handleSubmit} style={{ marginTop: '10px' }}>Submit</button>
      </div>
    </LocalizationProvider>
  );
}
function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/riders" element={<Riders />} />
          <Route path="/drivers" element={<Drivers />} />
        </Routes>
      </Router>
    </LocalizationProvider>
  );
}

export default App;
