const MerchantService = require("../services/MerchantService");
const {
	HttpBadRequest,
	HttpInternalServerError,
} = require("../utils/HttpError");

jest.mock("mysql2", () => {
	const mConnection = {
		release: jest.fn(),
	};
	const mPool = {
		getConnection: jest.fn((callback) => callback(null, mConnection)),
		on: jest.fn(),
	};
	return {
		createPool: jest.fn(() => mPool),
	};
});

const mockRepository = {
	UpdateCPOByID: jest.fn().mockImplementation(({ id, data, admin_id }) => ({
		affectedRows: 1,
	})),
	AuditTrail: jest.fn().mockResolvedValue(undefined),
	CheckIfColumnValueExists: jest
		.fn()
		.mockImplementation(({ table, column, value }) => []),
	AuditTrail: jest.fn().mockResolvedValue(undefined),
};

describe("Update CPO By ID", () => {
	let merchantService;

	beforeEach(() => {
		merchantService = new MerchantService(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should update CPO successfully", async () => {
		merchantService = new MerchantService(mockRepository);

		const testData = {
			id: 1,
			data: {
				cpo_owner_name: "CPO Owner Name Test",
				contact_name: "Contact Name Test",
				contact_number: "Contact Number Test",
				contact_email: "Contact Email Test",
				username: "Username Test",
			},
			admin_id: 1,
		};
		const result = await merchantService.UpdateCPOByID(testData);

		expect(result).toBe("SUCCESS");
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: testData.admin_id,
			cpo_id: null,
			action: `UPDATE Charging Point Operator with id of ${testData.id}`,
			remarks: "success",
		});
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.CheckIfColumnValueExists).toHaveBeenCalledTimes(5);
	});

	it("should return SUCCESS even no changes applied", async () => {
		merchantService = new MerchantService(mockRepository);

		const testData = {
			id: 1,
			data: {},
			admin_id: 1,
		};
		const result = await merchantService.UpdateCPOByID(testData);

		expect(result).toBe("NO_CHANGES_APPLIED");
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: testData.admin_id,
			cpo_id: null,
			action: "ATTEMPT to UPDATE Charging Point Operator - No Changes Applied",
			remarks: "success",
		});
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.CheckIfColumnValueExists).toHaveBeenCalledTimes(0);
	});

	it("should throw CPO_ID_DOES_NOT_EXIST when affectedRows is 0", async () => {
		mockRepository.UpdateCPOByID = jest
			.fn()
			.mockImplementation(({ id, data, admin_id }) => ({
				affectedRows: 0,
			}));

		const testData = {
			id: 1,
			data: { username: "test" },
			admin_id: 1,
		};
		merchantService = new MerchantService(mockRepository);

		await expect(merchantService.UpdateCPOByID(testData)).rejects.toThrow(
			new HttpBadRequest("CPO_ID_DOES_NOT_EXISTS")
		);
	});

	it("should throw VALIDATION ERROR when property to update is INVALID", async () => {
		mockRepository.UpdateCPOByID = jest
			.fn()
			.mockImplementation(({ id, data, admin_id }) => ({
				affectedRows: 1,
			}));

		const testData = {
			id: 1,
			data: { usernameszc: "test" },
			admin_id: 1,
		};

		merchantService = new MerchantService(mockRepository);

		await expect(merchantService.UpdateCPOByID(testData)).rejects.toThrow(
			HttpBadRequest
		);
	});

	it("should return it exists", async () => {
		mockRepository.CheckIfColumnValueExists = jest
			.fn()
			.mockImplementation(({ table, column, value }) => [1]);

		const testData = {
			id: 1,
			data: {
				cpo_owner_name: "CPO Owner Name Test",
				contact_name: "Contact Name Test",
				contact_number: "Contact Number Test",
				contact_email: "Contact Email Test",
				username: "Username Test",
			},
			admin_id: 1,
		};

		merchantService = new MerchantService(mockRepository);

		try {
			await merchantService.UpdateCPOByID(testData);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("INVALID_REQUEST");
			expect(err.data.errors).toEqual({
				username: "USERNAME_EXISTS",
				cpo_owner_name: "CPO_OWNER_NAME_EXISTS",
				contact_email: "CONTACT_EMAIL_EXISTS",
				contact_name: "CONTACT_NAME_EXISTS",
				cotnact_number: "CONTACT_NUMBER_EXISTS",
			});
			expect(mockRepository.CheckIfColumnValueExists).toHaveBeenCalledTimes(5);
		}
	});

	it("should return an error when UpdateCPOByID fails", async () => {
		mockRepository.UpdateCPOByID = jest
			.fn()
			.mockRejectedValue(HttpInternalServerError);

		const testData = {
			id: 1,
			data: {
				cpo_owner_name: "CPO Owner Name Test",
				contact_name: "Contact Name Test",
				contact_number: "Contact Number Test",
				contact_email: "Contact Email Test",
				username: "Username Test",
			},
			admin_id: 1,
		};

		merchantService = new MerchantService(mockRepository);
	});
});
