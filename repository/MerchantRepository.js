const mysql = require("../database/mysql");

module.exports = class MerchantRepository {
	CountCPOs() {
		const QUERY = `
			SELECT
				COUNT(*) AS total_cpos
			FROM
				cpo_owners
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
	 * Retrieves a list of Charging Point Operators (CPOs) with pagination.
	 *
	 * This method retrieves CPOs by executing an SQL query that joins the 'cpo_owners' table with the 'users' table
	 * to fetch additional user details. It limits the number of results returned and supports pagination.
	 *
	 * @param {Object} data - An object containing pagination parameters.
	 * @param {number} data.limit - The maximum number of results to return.
	 * @param {number} data.offset - The number of results to skip before starting to return data.
	 * @returns {Promise<Array<Object>>} A promise that resolves to an array of CPO objects.
	 */
	GetCPOs(data) {
		const QUERY = `
			SELECT 
				users.username, 
				cpo_owners.* 
			FROM cpo_owners 
			INNER JOIN users ON cpo_owners.user_id = users.id
			LIMIT ? OFFSET ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[parseInt(data.limit), parseInt(data.offset)],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	/**
	 * Registers a new Charging Point Operator (CPO) with the provided details.
	 *
	 * This method executes a stored procedure named 'WEB_ADMIN_REGISTER_CPO' in the database,
	 * which is responsible for registering a new CPO with the given parameters. It takes various
	 * details such as the party ID, CPO owner name, contact information, username, and password.
	 *
	 * @function RegisterCPO
	 * @param {Object} data - An object containing the details of the CPO to be registered.
	 * @param {string} data.party_id - The party ID of the CPO.
	 * @param {string} data.cpo_owner_name - The name of the CPO owner.
	 * @param {string} data.contact_name - The contact name of the CPO owner.
	 * @param {string} data.contact_number - The contact number of the CPO owner.
	 * @param {string} data.contact_email - The contact email of the CPO owner.
	 * @param {string} data.username - The desired username for the CPO.
	 * @param {string} data.password - The password for the CPO's account.
	 * @returns {Promise<Object>} A promise that resolves to the result of the registration process.
	 */
	RegisterCPO({
		party_id,
		cpo_owner_name,
		contact_name,
		contact_number,
		contact_email,
		username,
		password,
	}) {
		const QUERY = `CALL WEB_ADMIN_REGISTER_CPO(?,?,?,?,?,?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[
					party_id,
					cpo_owner_name,
					contact_name,
					contact_number,
					contact_email,
					username,
					password,
				],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	/**
	 * Checks if the provided value meets the registration requirements for a Charging Point Operator (CPO)
	 * based on the specified type.
	 *
	 * This method executes a stored procedure named 'WEB_ADMIN_CHECK_REGISTER_CPO' in the database,
	 * which validates the given value against the specified type to ensure it meets the registration
	 * criteria. It is used to validate inputs such as usernames, contact numbers, and contact emails
	 * before registering a new CPO.
	 *
	 * @function CheckRegisterCPO
	 * @param {string} type - The type of value to check, such as 'username', 'contact_number', or 'contact_email'.
	 * @param {string} value - The value to be checked against the specified type.
	 * @returns {Promise<Object>} A promise that resolves to the result of the validation process.
	 */
	CheckRegisterCPO(type, value) {
		const QUERY = `CALL WEB_ADMIN_CHECK_REGISTER_CPO(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [type, value], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Searches for Charging Point Operators (CPOs) by their owner name.
	 *
	 * This function retrieves CPOs whose owner names match the provided name partially or completely.
	 * It executes a SQL query to fetch the relevant data from the database.
	 *
	 * @function SearchCPOByName
	 * @param {string} cpoOwnerName - The name of the CPO owner to search for.
	 * @returns {Promise<Array<Object>>} A promise that resolves to an array of CPOs whose owner names match the provided input.
	 */
	SearchCPOByName(cpoOwnerName) {
		const QUERY = `
			SELECT 
				users.username, 
				cpo_owners.* 
			FROM cpo_owners
			INNER JOIN users ON cpo_owners.user_id = users.id
			WHERE 
				LOWER(cpo_owner_name) LIKE ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [`%${cpoOwnerName}%`], (err, result) => {
				if (err) {
					reject(err);
				}
				resolve(result);
			});
		});
	}

	/**
	 * Updates Charging Point Operator (CPO) information by ID.
	 *
	 * This function allows updating various fields of a CPO based on its unique identifier.
	 * It executes a SQL query to update the CPO record in the database.
	 *
	 * @function UpdateCPOByID
	 * @param {Object} params - An object containing the ID of the CPO to update and the update query.
	 * @param {number} params.id - The unique identifier of the CPO to update.
	 * @param {string} params.query - The SQL query for updating the CPO record.
	 * @returns {Promise<Object>} A promise that resolves to an object containing information about the update operation.
	 */
	UpdateCPOByID({ id, query }) {
		const QUERY = `
			UPDATE 
				cpo_owners
			INNER JOIN users ON cpo_owners.user_id = users.id
			${query} 
			WHERE 
				cpo_owners.id = ?`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [id], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	CheckIfColumnValueExists({ table, column, value }) {
		const QUERY = `
			SELECT 1 
			FROM ${table}
			WHERE ${column} = ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [value], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Adds an RFID card tag to a Charging Point Operator (CPO) by ID.
	 *
	 * This function associates an RFID card tag with a specific CPO, allowing access or identification purposes.
	 * It executes a SQL stored procedure to add the RFID card tag to the CPO in the database.
	 *
	 * @function AddRFID
	 * @param {number} cpoOwnerID - The unique identifier of the Charging Point Operator (CPO) to associate the RFID with.
	 * @param {string} rfidCardTag - The RFID card tag to add to the CPO.
	 * @returns {Promise<Object>} A promise that resolves to an object containing information about the RFID addition operation.
	 */
	AddRFID(cpoOwnerID, rfidCardTag) {
		const QUERY = `CALL WEB_ADMIN_ADD_RFID(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [cpoOwnerID, rfidCardTag], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	async GetRFIDs() {
		const QUERY = `
			SELECT
				rfid_card_tag
			FROM 
				rfid_cards
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

	async AddRFIDs(rfidCards) {
		const QUERY = `

			INSERT INTO 
				rfid_cards 
				(
					rfid_card_tag, 
					cpo_owner_id, 
					user_driver_id, 
					balance, 
					is_charging, 
					rfid_type, 
					rfid_status, 
					date_created, 
					date_modified
				)
			VALUES ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [rfidCards], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}
	/**
	 * Initiates a top-up operation for a Charging Point Operator (CPO) by ID.
	 *
	 * This function adds a specified amount of funds to the balance of a CPO account.
	 * It executes a SQL stored procedure to perform the top-up operation in the database.
	 *
	 * @function Topup
	 * @param {number} cpoOwnerID - The unique identifier of the Charging Point Operator (CPO) to top up.
	 * @param {number} amount - The amount of funds to add to the CPO's balance.
	 * @returns {Promise<Object>} A promise that resolves to an object containing information about the top-up operation.
	 */
	Topup(cpoOwnerID, amount) {
		const QUERY = `CALL WEB_ADMIN_TOPUP(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [cpoOwnerID, amount], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves top-up details for a Charging Point Operator (CPO) by ID.
	 *
	 * This function queries the database to fetch top-up logs associated with a specific CPO account.
	 * It retrieves top-up records that are still valid and have not been voided.
	 *
	 * @function GetTopupByID
	 * @param {number} cpoOwnerID - The unique identifier of the Charging Point Operator (CPO) to retrieve top-up details for.
	 * @returns {Promise<Object[]>} A promise that resolves to an array of objects containing top-up details.
	 */
	GetTopupByID(cpoOwnerID) {
		const QUERY = `
			SELECT 
				topup_logs.*, 
				topup_logs.id, 
				DATE_ADD(topup_logs.date_created, INTERVAL 60 MINUTE) AS voidable_until
			FROM topup_logs
			INNER JOIN cpo_owners ON cpo_owners.user_id = topup_logs.user_id
			WHERE 
				cpo_owners.id = ?
				AND NOW() < DATE_ADD(topup_logs.date_created, INTERVAL 60 MINUTE) 
				AND type = 'TOPUP'
				AND void_id IS NULL
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [cpoOwnerID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Voids a top-up transaction based on its reference ID.
	 *
	 * This function calls a stored procedure to void a top-up transaction in the database.
	 *
	 * @function VoidTopup
	 * @param {number} referenceID - The reference ID of the top-up transaction to be voided.
	 * @returns {Promise<Object>} A promise that resolves to an object containing the status of the void operation, the current balance, and the reference number.
	 */
	VoidTopup(referenceID) {
		const QUERY = `CALL WEB_ADMIN_VOID_TOPUP(?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, referenceID, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Deactivates a Charging Point Operator (CPO) account.
	 *
	 * This function updates the user_status field in the users table to 'INACTIVE' for a specific user ID,
	 * which deactivates the CPO account.
	 *
	 * @function DeactivateCPOAccount
	 * @param {number} userID - The ID of the user whose account is to be deactivated.
	 * @returns {Promise<Object>} A promise that resolves to an object containing information about the success of the deactivation operation.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	DeactivateCPOAccount(userID) {
		const QUERY = `
			UPDATE 
				users
			SET 
				user_status = 'INACTIVE'
			WHERE 
				id = ?
				AND role = 'CPO_OWNER'
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, userID, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Activates a Charging Point Operator (CPO) account.
	 *
	 * This function updates the user_status field in the users table to 'ACTIVE' for a specific user ID,
	 * which activates the CPO account.
	 *
	 * @function ActivateCPOAccount
	 * @param {number} userID - The ID of the user whose account is to be activated.
	 * @returns {Promise<Object>} A promise that resolves to an object containing information about the success of the activation operation.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	ActivateCPOAccount(userID) {
		const QUERY = `
			UPDATE 
				users
			SET 
				user_status = 'ACTIVE'
			WHERE 
				id = ?
				AND role = 'CPO_OWNER'
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, userID, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves details of company partners.
	 *
	 * This function fetches details of company partners from the company_partner_details table in the database.
	 *
	 * @function GetCompanyPartnerDetails
	 * @returns {Promise<Array>} A promise that resolves to an array containing the details of company partners retrieved from the database.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	GetCompanyPartnerDetails() {
		const QUERY = `

			SELECT 
				*
			FROM
				company_partner_details
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
	 * Registers company partner details.
	 *
	 * This function inserts new company partner details into the company_partner_details table in the database.
	 *
	 * @function RegisterCompanyPartnerDetails
	 * @param {Object} data - An object containing the company partner details to be registered.
	 * @param {string} data.company_name - The name of the company partner.
	 * @param {string} data.party_id - The party ID of the company partner.
	 * @param {string} data.country_code - The country code associated with the company partner.
	 * @returns {Promise<Object>} A promise that resolves to an object representing the result of the database operation.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	RegisterCompanyPartnerDetails({ company_name, party_id, country_code }) {
		const QUERY = `
			INSERT INTO 
				company_partner_details (company_name, party_id, country_code, account_status, date_created, date_modified)
			VALUES (
				?,?,?,'ACTIVE',NOW(), NOW()
			)
		`;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[company_name, party_id, country_code],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	/**
	 * Updates the country code of a company partner detail.
	 *
	 * This function updates the country code of an existing company partner detail in the company_partner_details table in the database.
	 *
	 * @function UpdateCompanyPartnerDetails
	 * @param {Object} data - An object containing the data required to update the company partner details.
	 * @param {string} data.country_code - The new country code to be set for the company partner.
	 * @param {number} data.id - The ID of the company partner detail to be updated.
	 * @returns {Promise<Object>} A promise that resolves to an object representing the result of the database operation.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	UpdateCompanyPartnerDetails({ country_code, id }) {
		const QUERY = `
		
			UPDATE 
				company_partner_details
			SET 
				country_code = ?
			WHERE 
				id = ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [country_code, id], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Records an audit trail entry for administrative actions.
	 *
	 * This function inserts a new audit trail entry into the admin_audit_trails table, logging actions performed by administrators.
	 *
	 * @function AuditTrail
	 * @param {Object} data - An object containing the data required to create the audit trail entry.
	 * @param {number} data.admin_id - The ID of the administrator performing the action.
	 * @param {number|null} data.cpo_id - The ID of the Charging Point Operator (CPO) related to the action, or null if not applicable.
	 * @param {string} data.action - A description of the action performed by the administrator.
	 * @param {string} data.remarks - Additional remarks or notes about the action.
	 * @returns {Promise<Object>} A promise that resolves to an object representing the result of the database operation.
	 * @throws {Error} If an error occurs during the database operation, it is thrown with details.
	 */
	AuditTrail({ admin_id, cpo_id, action, remarks }) {
		const QUERY = `
			INSERT INTO 
				admin_audit_trails (admin_id, cpo_id, action, remarks, date_created, date_modified)
			VALUES (
				?,?,?,?,NOW(),NOW()
			)
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [admin_id, cpo_id, action, remarks], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}
};
