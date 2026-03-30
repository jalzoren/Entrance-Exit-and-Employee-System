import React, { useState, useEffect } from "react";
import { MdClose, MdVisibility, MdVisibilityOff } from "react-icons/md";
import "../componentscss/AddUser.css";
import "../css/GlobalModal.css";
import Swal from 'sweetalert2';

function EditUser({ onClose, onUserUpdated, userEmail }) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [extension, setExtension] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [showLoadingPopup, setShowLoadingPopup] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Convert to UPPERCASE
  const toUpperCase = (str) => {
    return str.toUpperCase();
  };

  const handleLastNameChange = (e) => {
    setLastName(toUpperCase(e.target.value));
  };

  const handleFirstNameChange = (e) => {
    setFirstName(toUpperCase(e.target.value));
  };

  const handleMiddleNameChange = (e) => {
    setMiddleName(toUpperCase(e.target.value));
  };

  const handleExtensionChange = (e) => {
    setExtension(toUpperCase(e.target.value));
  };

  useEffect(() => {
    if (userEmail) {
      fetchUserData();
    }
  }, [userEmail]);

  const fetchUserData = async () => {
    try {
      setFetchLoading(true);
      setShowLoadingPopup(true);
      
      const response = await fetch(`http://localhost:5000/api/users/${encodeURIComponent(userEmail)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      
      // Parse fullname (format: "Last, First Middle Ext.")
      const nameParts = userData.fullname.split(', ');
      
      // Last name is the first part
      const lastName = nameParts[0] || '';
      
      // Get the first, middle, and extension
      const restParts = nameParts[1] ? nameParts[1].split(' ') : [];
      
      // Check if there's an extension (JR., SR., III, etc.)
      let firstName = '';
      let middleName = '';
      let extension = '';
      
      const possibleExtensions = ['JR.', 'SR.', 'III', 'IV', 'V', 'II', 'JR', 'SR'];
      
      if (restParts.length > 1) {
        // Check if last word is an extension
        const lastWord = restParts[restParts.length - 1].toUpperCase().replace('.', '');
        if (possibleExtensions.includes(lastWord)) {
          extension = restParts.pop();
          // Now check if there's a middle name
          if (restParts.length > 1) {
            middleName = restParts.pop();
          }
          firstName = restParts.join(' ');
        } else if (restParts.length > 1) {
          // No extension, but multiple words - last word is middle name
          middleName = restParts.pop();
          firstName = restParts.join(' ');
        } else {
          firstName = restParts[0] || '';
        }
      } else {
        firstName = restParts[0] || '';
      }

      setLastName(lastName);
      setFirstName(firstName);
      setMiddleName(middleName);
      setExtension(extension);
      setEmail(userData.email);
      setRole(userData.role);
      
      setDataLoaded(true);
      
    } catch (err) {
      console.error('Error fetching user:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to load user data. Please try again.',
        confirmButtonColor: '#3085d6'
      }).then(() => {
        onClose();
      });
    } finally {
      setFetchLoading(false);
    }
  };

  // Add delay timers
  useEffect(() => {
    let loadingTimer;
    
    loadingTimer = setTimeout(() => {
      if (dataLoaded) {
        setShowLoadingPopup(false);
      }
    }, 2000);

    return () => {
      clearTimeout(loadingTimer);
    };
  }, [dataLoaded]);

  useEffect(() => {
    if (!fetchLoading && dataLoaded) {
      const timer = setTimeout(() => {
        setShowLoadingPopup(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [fetchLoading, dataLoaded]);

  const validateForm = () => {
    if (!lastName || !firstName || !email || !role) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill in all required fields',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

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

    if (password) {
      // Validate password strength if trying to change
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        Swal.fire({
          icon: 'warning',
          title: 'Weak Password',
          text: 'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character',
          confirmButtonColor: '#3085d6'
        });
        return false;
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        Swal.fire({
          icon: 'warning',
          title: 'Password Mismatch',
          text: 'Passwords do not match',
          confirmButtonColor: '#3085d6'
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Confirm Update',
      text: 'Are you sure you want to update this user?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, update it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);

    const updateData = {
      lastName,
      firstName,
      middleName,
      extension,
      email,
      role,
    };

    if (password) {
      updateData.password = password;
    }

    try {
      Swal.fire({
        title: 'Updating User...',
        text: 'Please wait',
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch(`http://localhost:5000/api/users/${encodeURIComponent(userEmail)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      Swal.close();

      // Single success message
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'User has been updated successfully.',
        timer: 2000,
        showConfirmButton: false
      });

      const updatedUserResponse = await fetch(`http://localhost:5000/api/users/${encodeURIComponent(email)}`);
      const updatedUser = await updatedUserResponse.json();

      onUserUpdated(updatedUser);
      onClose();
      
    } catch (err) {
      console.error('Error updating user:', err);
      
      Swal.close();
      
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err.message || 'Failed to update user. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (lastName || firstName || email || role || password || confirmPassword || extension) {
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

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (showLoadingPopup) {
    return (
      <div className="modal-overlay">
        <div className="modal-container" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <div className="modal-body" style={{ padding: '40px 30px' }}>
            <div style={{ 
              border: '5px solid #f3f3f3',
              borderTop: '5px solid #3085d6',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 25px'
            }}></div>
            
            <h3 style={{ 
              fontSize: '22px', 
              color: '#333', 
              marginBottom: '15px',
              fontWeight: '600'
            }}>
              Loading User Data
            </h3>
            
            <p style={{ 
              fontSize: '16px', 
              color: '#666',
              lineHeight: '1.5'
            }}>
              Please wait while we fetch the user information...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">EDIT USER</h2>
          <button className="modal-close" onClick={handleCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
              * Required fields (All letters will be UPPERCASE)
            </div>

            <div className="modal-grid-2">
              <div className="modal-field">
                <label className="modal-label">Last Name <span className="required">*</span></label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="e.g. DELA CRUZ"
                  value={lastName}
                  onChange={handleLastNameChange}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div className="modal-field">
                <label className="modal-label">Email <span className="required">*</span></label>
                <input
                  className="modal-input"
                  type="email"
                  placeholder="e.g juandelacruz@plpasig.edu.ph"
                  value={email}
                  disabled
                  style={{ textTransform: 'lowercase', backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div className="modal-grid-2">
              <div className="modal-field">
                <label className="modal-label">First Name <span className="required">*</span></label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="e.g JUAN"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div className="modal-field">
                <label className="modal-label">Role <span className="required">*</span></label>
                <select
                  className="modal-select"
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

            <div className="modal-grid-2">
              <div className="modal-field">
                <label className="modal-label">Middle Name</label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="e.g SMITH"
                  value={middleName}
                  onChange={handleMiddleNameChange}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="modal-field">
                <label className="modal-label">Extension</label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="e.g. JR., SR., III"
                  value={extension}
                  onChange={handleExtensionChange}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>

            {/* Password fields */}
            <div className="modal-grid-2">
              <div className="modal-field">
                <label className="modal-label">New Password <span style={{ color: '#999', fontSize: '0.85rem', fontWeight: 'normal' }}>(Optional)</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="modal-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Leave empty to keep current"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <small style={{ fontSize: '0.75rem', color: '#999', marginTop: '4px', display: 'block' }}>
                  8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special
                </small>
              </div>

              {password && (
                <div className="modal-field">
                  <label className="modal-label">Confirm Password <span className="required">*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="modal-input"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!!password}
                    />
                    <button 
                      type="button"
                      className="password-toggle-btn"
                      onClick={toggleConfirmPasswordVisibility}
                      tabIndex="-1"
                    >
                      {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="modal-btn modal-btn-cancel"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn-save"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditUser;