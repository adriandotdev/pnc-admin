const mysql = require("../database/mysql");

module.exports = class ReportsRepository {
	/**
	 * Retrieves the total number of Charging Point Operators (CPOs).
	 *
	 * This function queries the database to count the total number of entries in the `cpo_owners` table.
	 * The result is ordered by the date the entries were created in descending order.
	 *
	 * @function GetTotalCPOs
	 * @returns {Promise<Object>} A promise that resolves to an object containing the total number of CPOs.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	GetTotalCPOs() {
		const QUERY = `
			SELECT 
				COUNT(*) AS total_cpos
			FROM 
				cpo_owners
			ORDER BY
				date_created DESC
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves the total number of RFID cards with various statuses and their respective effective dates.
	 *
	 * This function queries the database to count the total number of RFID cards that are 'ACTIVE', 'UNASSIGNED',
	 * and the overall total. It also retrieves the most recent assignment and creation dates for these RFID cards.
	 *
	 * @function GetTotalRFIDs
	 * @returns {Promise<Object>} A promise that resolves to an object containing the total counts and effective dates of RFID cards.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	GetTotalRFIDs() {
		const QUERY = `
			SELECT
				(SELECT COUNT(*) FROM rfid_cards WHERE rfid_status = 'ACTIVE' ORDER BY date_assigned DESC) AS total_assigned_rfids,
				(SELECT COUNT(*) FROM rfid_cards WHERE rfid_status = 'UNASSIGNED' ORDER BY date_created DESC) AS total_unassigned_rfids,
				(SELECT COUNT(*) FROM rfid_cards ORDER BY date_created DESC) AS total_rfids,
				(SELECT MAX(date_assigned) FROM rfid_cards WHERE rfid_status = 'ACTIVE') AS effective_date_of_total_assigned_rfids,
				(SELECT MAX(date_created) FROM rfid_cards WHERE rfid_status = 'UNASSIGNED') AS effective_date_of_total_unassigned_rfids,
				(SELECT MAX(date_created) FROM rfid_cards) AS effective_date_of_total_rfids
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves the total number of EVSEs (Electric Vehicle Supply Equipment) with various statuses and their respective effective dates.
	 *
	 * This function queries the database to count the total number of EVSEs that are assigned to a CPO location,
	 * unassigned, and the overall total. It also retrieves the most recent creation dates for these EVSEs based on their status.
	 *
	 * @function GetTotalEVSEs
	 * @returns {Promise<Object>} A promise that resolves to an object containing the total counts and effective dates of EVSEs.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	GetTotalEVSEs() {
		const QUERY = `
			SELECT 
				(SELECT COUNT(*) FROM evse WHERE cpo_location_id IS NOT NULL) AS total_assigned_evses,
				(SELECT COUNT(*) FROM evse WHERE cpo_location_id IS NULL) AS total_unassigned_evses,
				(SELECT COUNT(*) FROM evse) AS total_evses,
				(SELECT MAX(date_created) FROM evse WHERE cpo_location_id IS NOT NULL) AS effective_date_of_total_assigned_evses,
				(SELECT MAX(date_created) FROM evse WHERE cpo_location_id IS NULL) AS effective_date_of_total_unassigned_evses,
				(SELECT MAX(date_created) FROM evse) AS effective_date_of_total_evses 
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves the total number of CPO locations with various statuses and their respective effective dates.
	 *
	 * This function queries the database to count the total number of CPO locations that are assigned to a CPO owner,
	 * unassigned, and the overall total. It also retrieves the most recent creation date for all CPO locations.
	 *
	 * @function GetTotalLocations
	 * @returns {Promise<Object>} A promise that resolves to an object containing the total counts and effective dates of CPO locations.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	GetTotalLocations() {
		const QUERY = `

			SELECT 
				(SELECT COUNT(*) FROM cpo_locations WHERE cpo_owner_id IS NOT NULL) AS total_assigned_locations,
				(SELECT COUNT(*) FROM cpo_locations WHERE cpo_owner_id IS NULL) AS total_unassigned_locations,
				(SELECT COUNT(*) FROM cpo_locations) AS total_locations,
				(SELECT MAX(date_created) FROM cpo_locations) AS effective_date_of_total_locations
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves the total topup sales, voided topups, and categorized topup sales along with the most recent topup date.
	 *
	 * This function queries the database to calculate the total amount of topup sales, voided topups, and topup sales
	 * categorized by payment type (CARD and MAYA). Additionally, it fetches the most recent topup date.
	 *
	 * @function GetTotalTopups
	 * @returns {Promise<Object>} A promise that resolves to an object containing the total amounts and the effective date of topup sales.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	GetTotalTopups() {
		const QUERY = `

			SELECT
				(SELECT SUM(amount) FROM topup_logs WHERE type = 'TOPUP') AS total_topup_sales,
				(SELECT SUM(amount) FROM topup_logs WHERE type = 'VOID') AS total_void_topups,
				(SELECT SUM(amount) FROM topup_logs WHERE type = 'TOPUP' AND payment_type = 'CARD') AS total_topup_card_sales,
				(SELECT SUM(amount) FROM topup_logs WHERE type = 'TOPUP' AND payment_type = 'MAYA') AS total_topup_maya_sales,
				(SELECT MAX(date_created) FROM topup_logs WHERE type = 'TOPUP') AS effective_date_of_topup_sales
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}
};
