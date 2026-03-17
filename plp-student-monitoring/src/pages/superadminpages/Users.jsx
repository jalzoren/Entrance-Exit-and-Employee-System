import React, { useState } from "react";
import "../../css/Users.css";
import { FiPlus } from "react-icons/fi";
import AddUser from "../../components/AddUser";

function Users() {

  const [showAddUser, setShowAddUser] = useState(false);

  const [users] = useState([
    {
      id: 1,
      username: "admin_eems",
      full_name: "Juan Dela Cruz",
      role: "EEMS Admin"
    },
    {
      id: 2,
      username: "admin_eams",
      full_name: "Maria Santos",
      role: "EAMS Admin"
    },
    {
      id: 3,
      username: "staff01",
      full_name: "Pedro Reyes",
      role: "EEMS Admin"
    }
  ]);

  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const recordsPerPage = 5;

  const filteredUsers = users.filter((user) => {

    const matchesRole =
      roleFilter === "" || user.role === roleFilter;

    const matchesSearch =
      searchQuery === "" ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesRole && matchesSearch;

  });

  const totalPages = Math.ceil(filteredUsers.length / recordsPerPage);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;

  const currentUsers = filteredUsers.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  const handlePageChange = (page) => {

    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }

  };

  const handleEdit = (id) => {
    console.log("Edit user:", id);
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
          <option value="">Role</option>
          <option value="EEMS Admin">EEMS Admin</option>
          <option value="EAMS Admin">EAMS Admin</option>
        </select>

        <input
          type="text"
          className="search-input"
          placeholder="Search"
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

        <table className="user-table">

          <thead>
            <tr>
              <th>No.</th>
              <th>Username</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {currentUsers.length > 0 ? (

              currentUsers.map((user, index) => (

                <tr key={user.id}>

                  <td>{indexOfFirstRecord + index + 1}</td>

                  <td>{user.username}</td>

                  <td>{user.full_name}</td>

                  <td>{user.role}</td>

                  <td className="action-cell">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(user.id)}
                    >
                      Edit
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

      </div>

      {/* PAGINATION */}

      {filteredUsers.length > 0 && (

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
        <AddUser onClose={() => setShowAddUser(false)} />
      )}

    </div>

  );
}

export default Users;