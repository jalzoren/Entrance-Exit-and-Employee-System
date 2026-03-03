-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 26, 2026 at 08:57 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `eems`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `admin_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `fullname` varchar(100) NOT NULL,
  `role` enum('Super Admin','EEMS Admin','EAMS Admin') NOT NULL,
  `password` varchar(255) NOT NULL,
  `reset_code` varchar(50) DEFAULT NULL,
  `code_expiry` datetime DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`admin_id`, `email`, `fullname`, `role`, `password`, `reset_code`, `code_expiry`, `created`) VALUES
(2300295, 'cassyrain03@gmail.com', 'Bianca Rain Castillon', 'Super Admin', 'Admin123', NULL, NULL, '2026-02-26 07:19:51');

-- --------------------------------------------------------

--
-- Table structure for table `authentication`
--

CREATE TABLE `authentication` (
  `auth_id` bigint(20) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `method` enum('FACIAL','MANUAL') NOT NULL,
  `auth_status` enum('SUCCESS','FAILED') DEFAULT NULL,
  `accuracy` decimal(5,2) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `timestamp` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `entry_exit_logs`
--

CREATE TABLE `entry_exit_logs` (
  `log_id` bigint(20) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `auth_id` bigint(20) NOT NULL,
  `action` enum('ENTRY','EXIT') NOT NULL,
  `log_time` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `student_id` varchar(20) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `college_department` varchar(100) NOT NULL,
  `year_level` int(11) NOT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL,
  `face_image` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`admin_id`);

--
-- Indexes for table `authentication`
--
ALTER TABLE `authentication`
  ADD PRIMARY KEY (`auth_id`),
  ADD KEY `idx_auth_student` (`student_id`);

--
-- Indexes for table `entry_exit_logs`
--
ALTER TABLE `entry_exit_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `auth_id` (`auth_id`),
  ADD KEY `idx_log_student` (`student_id`),
  ADD KEY `idx_log_time` (`log_time`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`student_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2300296;

--
-- AUTO_INCREMENT for table `authentication`
--
ALTER TABLE `authentication`
  MODIFY `auth_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `entry_exit_logs`
--
ALTER TABLE `entry_exit_logs`
  MODIFY `log_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `authentication`
--
ALTER TABLE `authentication`
  ADD CONSTRAINT `authentication_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `entry_exit_logs`
--
ALTER TABLE `entry_exit_logs`
  ADD CONSTRAINT `entry_exit_logs_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `entry_exit_logs_ibfk_2` FOREIGN KEY (`auth_id`) REFERENCES `authentication` (`auth_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
