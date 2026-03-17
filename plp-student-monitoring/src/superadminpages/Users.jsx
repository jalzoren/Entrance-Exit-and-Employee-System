import React, { useState, useEffect } from "react";
import "../css/Users.css";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import AddUser from "../components/AddUser";
// Import SweetAlert2
import Swal from 'sweetalert2';

function Users() {
  const [showAddUser, setShowAddUser] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      
      // Transform data to match your frontend structure
      const transformedUsers = data.map(user => {
        // Parse fullname (assuming format: "Last, First Middle")
        const nameParts = user.fullname.split(', ');
        const lastName = nameParts[0] || '';
        const firstAndMiddle = nameParts[1] ? nameParts[1].split(' ') : [];
        const firstName = firstAndMiddle[0] || '';
        const middleName = firstAndMiddle.slice(1).join(' ') || '';
        
        return {
          id: user.admin_id, // This is the ID number
          username: user.email.split('@')[0], // Use email prefix as username
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
      
      // Show error alert
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

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle new user added
  const handleUserAdded = (newUser) => {
    // Transform the new user data
    const transformedUser = {
      id: newUser.admin_id,
      username: newUser.email.split('@')[0],
      email: newUser.email,
      full_name: newUser.fullname,
      firstName: newUser.fullname.split(', ')[1]?.split(' ')[0] || '',
      lastName: newUser.fullname.split(', ')[0] || '',
      role: newUser.role,
      created: newUser.created
    };
    
    setUsers(prevUsers => [transformedUser, ...prevUsers]);
    setShowAddUser(false);
    
    // Show success alert
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: 'User has been added successfully.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleEdit = (id) => {
    // Find the user to edit
    const userToEdit = users.find(user => user.id === id);
    
    // Show edit prompt
    Swal.fire({
      title: 'Edit User',
      text: `Edit user: ${userToEdit?.full_name}`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Edit',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        // Implement your edit functionality here
        console.log("Edit user:", id);
        
        Swal.fire({
          icon: 'info',
          title: 'Coming Soon',
          text: 'Edit functionality will be implemented soon!',
          confirmButtonColor: '#3085d6'
        });
      }
    });
  };

  const handleDelete = async (id) => {
    // Find user for the confirmation message
    const userToDelete = users.find(user => user.id === id);
    
    // Show confirmation dialog
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
      // Show loading
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
      
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      // Close loading
      Swal.close();
      
      // Update state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
      
      // Show success alert
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'User has been deleted successfully.',
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (err) {
      console.error('Error deleting user:', err);
      
      // Close loading
      Swal.close();
      
      // Show error alert
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to delete user. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    }
  };

  // Filter users based on role and search query
  const filteredUsers = users.filter((user) => {
    const matchesRole = roleFilter === "" || user.role === roleFilter;
    const matchesSearch = searchQuery === "" ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toString().toLowerCase().includes(searchQuery.toLowerCase());
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
      {/* HEADER */}
      <header className="header-card">
        <h1>USER MANAGEMENT</h1>
        <p className="subtitle">Dashboard / User Management</p>
      </header>

      <hr className="header-divider" />

      {/* CONTROLS */}
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
          placeholder="Search by ID, name, email or username"
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

      {/* TABLE */}
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
                <th>ID Number</th>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length > 0 ? (
                currentUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{indexOfFirstRecord + index + 1}</td>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
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
                        onClick={() => handleEdit(user.id)}
                        title="Edit User"
                      >
                        <FiEdit2 /> Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(user.id)}
                        title="Delete User"
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}
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

      {/* ADD USER MODAL */}
      {showAddUser && (
        <AddUser 
          onClose={() => setShowAddUser(false)}
          onUserAdded={handleUserAdded}
        />
      )}
    </div>
  );
}

export default Users;