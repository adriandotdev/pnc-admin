module.exports = class UserManagementService {
	/**
	 * @type {UserManagementService}
	 */
	#repository;

	constructor(repository) {
		this.#repository = repository;
	}

	async AddSubUser(data) {
		const result = await this.#repository.AddSubUser(data);

		return result;
	}
};
