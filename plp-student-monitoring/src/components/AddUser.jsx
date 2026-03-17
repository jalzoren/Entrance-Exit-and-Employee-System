import React, { useState } from "react";
import { MdClose, MdVisibility, MdVisibilityOff } from "react-icons/md";
import "../componentscss/AddUser.css";
// Import SweetAlert2
import Swal from 'sweetalert2';

function AddUser({ onClose, onUserAdded }) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [email, setEmail] = useState("");
  const [idnum, setIdnum] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!lastName || !firstName || !email || !role || !password || !idnum) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill in all required fields',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Email',
        text: 'Please enter a valid email address',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

    // Validate password length
    if (password.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'Password must be at least 6 characters long',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

    // Validate ID number
    if (idnum.length < 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid ID Number',
        text: 'Please enter a valid ID number',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form submission refresh
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const newUser = {
      lastName,
      firstName,
      middleName,
      idnum,
      email,
      role,
      password
    };

    try {
      // Show loading message
      Swal.fire({
        title: 'Creating User...',
        text: 'Please wait',
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      // Close loading alert
      Swal.close();

      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'User has been created successfully.',
        timer: 2000,
        showConfirmButton: false
      });

      // Call the callback with the new user data
      onUserAdded(data);
      onClose();
      
    } catch (err) {
      console.error('Error creating user:', err);
      
      // Close loading alert
      Swal.close();
      
      // Show error message
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err.message || 'Failed to create user. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (lastName || firstName || email || idnum || role || password) {
      Swal.fire({
        title: 'Discard Changes?',
        text: 'You have unsaved changes. Are you sure you want to close?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, discard',
        cancelButtonText: 'Stay'
      }).then((result) => {
        if (result.isConfirmed) {
          onClose();
        }
      });
    } else {
      onClose();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="popup-overlay">
      <div className="register-container">
        {/* HEADER */}
        <div className="register-header">
          <div className="register-text">ADD USER</div>
          <div className="register-close-btn" onClick={handleCancel}>
            <MdClose />
          </div>
        </div>

        {/* FORM - Added form tag to fix password warning */}
        <form onSubmit={handleSubmit}>
          <div className="register-form">
            <div className="form-note">* Required fields</div>

            {/* ROW 1 */}
            <div className="form-row">
              <div className="input-group">
                <label>Last Name <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Dela Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Email <span className="required">*</span></label>
                <input
                  type="email"
                  placeholder="e.g juandelacruz@plpasig.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* ROW 2 */}
            <div className="form-row">
              <div className="input-group">
                <label>First Name <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="e.g Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Role <span className="required">*</span></label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                >
                  <option value="">Select Role</option>
                  <option value="EEMS Admin">EEMS Admin</option>
                  <option value="EAMS Admin">EAMS Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>
            </div>

            {/* ROW 3 */}
            <div className="form-row">
              <div className="input-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  placeholder="e.g Smith"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>ID Number <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 2020-0001"
                  value={idnum}
                  onChange={(e) => setIdnum(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password field with eye icon */}
            <div className="input-group password-field">
              <label>Password <span className="required">*</span></label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  className="password-toggle-btn"
                  onClick={togglePasswordVisibility}
                  tabIndex="-1"
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="form-actions">
              <button
                type="submit"
                className="btn add"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add User'}
              </button>

              <button
                type="button"
                className="btn cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddUser;