import React, { useState } from "react";
import "../../css/Users.css";
import { FiPlus } from "react-icons/fi";
import AddUser from "../../components/AddUser";
import Swal from 'sweetalert2';

function Users() {
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      
      const transformedUsers = data.map(user => {
        const nameParts = user.fullname.split(', ');
        const lastName = nameParts[0] || '';
        const firstAndMiddle = nameParts[1] ? nameParts[1].split(' ') : [];
        
        let firstName = '';
        let middleName = '';
        
        if (firstAndMiddle.length > 1) {
          middleName = firstAndMiddle.pop();
          firstName = firstAndMiddle.join(' ');
        } else {
          firstName = firstAndMiddle[0] || '';
          middleName = '';
        }
        
        return {
          email: user.email,
          full_name: user.fullname,
          firstName: firstName,
          lastName: lastName,
          middleName: middleName,
          role: user.role,
          created: user.created
        };
      });
      
      setUsers(transformedUsers);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to load users. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserAdded = (newUser) => {
    const nameParts = newUser.fullname.split(', ');
    const lastName = nameParts[0] || '';
    const firstAndMiddle = nameParts[1] ? nameParts[1].split(' ') : [];
    
    let firstName = '';
    let middleName = '';
    
    if (firstAndMiddle.length > 1) {
      middleName = firstAndMiddle.pop();
      firstName = firstAndMiddle.join(' ');
    } else {
      firstName = firstAndMiddle[0] || '';
      middleName = '';
    }
    
    const transformedUser = {
      email: newUser.email,
      full_name: newUser.fullname,
      firstName: firstName,
      lastName: lastName,
      middleName: middleName,
      role: newUser.role,
      created: newUser.created
    };
    
    setUsers(prevUsers => [transformedUser, ...prevUsers]);
    setShowAddUser(false);
    
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: 'User has been added successfully.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleEdit = (email) => {
    console.log("Editing user with email:", email); // Debug log
    setSelectedUserEmail(email);
    setShowEditUser(true);
  };

  const handleUserUpdated = (updatedUser) => {
    const nameParts = updatedUser.fullname.split(', ');
    const lastName = nameParts[0] || '';
    const firstAndMiddle = nameParts[1] ? nameParts[1].split(' ') : [];
    
    let firstName = '';
    let middleName = '';
    
    if (firstAndMiddle.length > 1) {
      middleName = firstAndMiddle.pop();
      firstName = firstAndMiddle.join(' ');
    } else {
      firstName = firstAndMiddle[0] || '';
      middleName = '';
    }
    
    const transformedUser = {
      email: updatedUser.email,
      full_name: updatedUser.fullname,
      firstName: firstName,
      lastName: lastName,
      middleName: middleName,
      role: updatedUser.role,
      created: updatedUser.created
    };
    
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.email === transformedUser.email ? transformedUser : user
      )
    );
    
    setShowEditUser(false);
    setSelectedUserEmail(null);
    
    Swal.fire({
      icon: 'success',
      title: 'Updated!',
      text: 'User has been updated successfully.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleDelete = async (email) => {
    const userToDelete = users.find(user => user.email === email);
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete ${userToDelete?.full_name}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) {
      return;
    }
    
    try {
      Swal.fire({
        title: 'Deleting...',
        text: 'Please wait',
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const response = await fetch(`http://localhost:5000/api/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      Swal.close();
      setUsers(prevUsers => prevUsers.filter(user => user.email !== email));
      
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'User has been deleted successfully.',
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (err) {
      console.error('Error deleting user:', err);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to delete user. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesRole = roleFilter === "" || user.role === roleFilter;
    const matchesSearch = searchQuery === "" ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const totalPages = Math.ceil(filteredUsers.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="user-management">
      <header className="header-card">
        <h1>USER MANAGEMENT</h1>
        <p className="subtitle">Dashboard / User Management</p>
      </header>

      <hr className="header-divider" />

      <div className="controls">
        <select
          className="filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="EEMS Admin">EEMS Admin</option>
          <option value="EAMS Admin">EAMS Admin</option>
          <option value="Super Admin">Super Admin</option>
        </select>

        <input
          type="text"
          className="search-input"
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <button
          className="action-button add-button"
          onClick={() => setShowAddUser(true)}
        >
          <FiPlus className="button-icon" />
          Add User
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <table className="user-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length > 0 ? (
                currentUsers.map((user, index) => (
                  <tr key={user.email}>
                    <td>{indexOfFirstRecord + index + 1}</td>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role.replace(/\s+/g, '-').toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(user.email)}
                        title="Edit User"
                      >
                        <FiEdit2 /> Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(user.email)}
                        title="Delete User"
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-data">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !error && filteredUsers.length > 0 && (
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>

          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`page-number ${
                  currentPage === i + 1 ? "active" : ""
                }`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {showAddUser && (
        <AddUser 
          onClose={() => setShowAddUser(false)}
          onUserAdded={handleUserAdded}
        />
      )}

      {showEditUser && selectedUserEmail && (
        <EditUser
          onClose={() => {
            setShowEditUser(false);
            setSelectedUserEmail(null);
          }}
          onUserUpdated={handleUserUpdated}
          userEmail={selectedUserEmail}
        />
      )}
    </div>
  );
}

export default Users;