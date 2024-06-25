const mysql = require("../database/mysql");

module.exports = class UserManagementRepository {
	AddSubUser(data) {
		const QUERY = `
            CALL WEB_ADMIN_ADD_SUB_USER(?,?,?,?,?,?,?,?,?,?,?,?)
        `;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[
					data.username,
					data.password,
					data.role,
					data.privileges.reports,
					data.privileges.cpos,
					data.privileges.locations,
					data.privileges.evses,
					data.privileges.customer_service,
					data.privileges.user_management,
					data.privileges.account_settings,
					data.privileges.rfid_user_accounts,
					data.privileges.topups,
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
};
