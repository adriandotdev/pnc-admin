const axios = require("axios");
const MerchantService = require("../services/MerchantService");
const {
	HttpBadRequest,
	HttpInternalServerError,
} = require("../utils/HttpError");

jest.mock("generate-password");

jest.mock("../utils/Email.js", () => {
	return jest.fn().mockImplementation(() => ({
		SendUsernameAndPassword: jest.fn().mockResolvedValue(undefined),
	}));
});

jest.mock("mysql2", () => {
	const mConnection = {
		release: jest.fn(),
		commit: jest.fn(),
		rollback: jest.fn(),
		query: jest.fn(),
	};

	const mPool = {
		getConnection: jest.fn((callback) => callback(null, mConnection)),
		on: jest.fn(),
	};
	return {
		createPool: jest.fn(() => mPool),
	};
});

jest.mock("axios");

const mockRepository = {
	AddRFID: jest
		.fn()
		.mockImplementation((cpoOwnerID, rfidCardTag) => [[{ STATUS: "SUCCESS" }]]),
	AddRFIDs: jest.fn(),
	ActivateCPOAccount: jest.fn().mockResolvedValue({ affectedRows: 1 }),
	DeactivateCPOAccount: jest.fn().mockResolvedValue({ affectedRows: 1 }),
	RegisterCompanyPartnerDetails: jest.fn().mockResolvedValue({ insertId: 1 }),
	GetCompanyPartnerDetails: jest.fn().mockResolvedValue([{ party_id: "123" }]),
	RegisterCPO: jest.fn().mockResolvedValue([[{ STATUS: "ERROR" }]]),
	CheckRegisterCPO: jest
		.fn()
		.mockImplementation((type, value) => [[{ STATUS: "SUCCESS" }]]),
	UpdateCPOByID: jest
		.fn()
		.mockImplementation(({ id, data, admin_id }) => [[{ STATUS: "SUCCESS" }]]),
	Topup: jest
		.fn()
		.mockResolvedValue([[{ STATUS: "SUCCESS", current_balance: 2000 }]]),
	UpdateCPOByID: jest.fn().mockImplementation(({ id, data, admin_id }) => ({
		affectedRows: 1,
	})),
	CheckIfColumnValueExists: jest
		.fn()
		.mockImplementation(({ table, column, value }) => []),
	CountCPOs: jest.fn(),
	GetCPOs: jest.fn(),
	SearchCPOByName: jest.fn(),
	GetRFIDs: jest.fn(),
	GetTopupByID: jest.fn(),
	VoidTopup: jest.fn(),
	GetCompanyPartnerDetails: jest.fn(),
	UpdateCompanyPartnerDetails: jest.fn(),
	AuditTrail: jest.fn().mockResolvedValue(undefined),
};

describe("Merchant Service - Unit Tests", () => {
	/**
	 * @type {MerchantService}
	 */
	let service;

	beforeEach(() => {
		service = new MerchantService(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should ADD RFID to CPO - AddRFID", async () => {
		service = new MerchantService(mockRepository);

		const testData = {
			cpo_owner_id: 1,
			rfidCardTag: "12345678",
			admin_id: 1,
		};

		const result = await service.AddRFID(
			testData.cpo_owner_id,
			testData.rfidCardTag,
			testData.admin_id
		);

		expect(result).toBe("SUCCESS");
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: `ADD RFID to Charging Point Operator with id of ${testData.cpo_owner_id}`,
			remarks: "success",
		});
	});

	it("should successfully ADD RFIDs - AddRFIDs", async () => {
		mockRepository.GetRFIDs.mockResolvedValue([]);

		const result = await service.AddRFIDs(1, ["12345", "12346"]);

		expect(result).toBe("SUCCESS");
	});

	it("should throw BAD REQUEST when RFID exists - AddRFIDs", async () => {
		mockRepository.GetRFIDs.mockResolvedValue([{ rfid_card_tag: "12345" }]);

		try {
			await service.AddRFIDs(1, ["12345", "12346"]);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe(`RFID_EXISTS: 12345`);
		}
	});

	it("should return Bad Request when STATUS is FAILED - AddRFID", async () => {
		mockRepository.AddRFID = jest
			.fn()
			.mockImplementation((cpoOwnerID, rfidCardTag) => [
				[{ STATUS: "FAILED" }],
			]);

		service = new MerchantService(mockRepository);

		const testData = {
			cpo_owner_id: 1,
			rfidCardTag: "12345678",
			admin_id: 1,
		};

		try {
			await service.AddRFID(
				testData.cpo_owner_id,
				testData.rfidCardTag,
				testData.admin_id
			);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: testData.admin_id,
				cpo_id: null,
				action: "ATTEMPT to ADD RFID to Charging Point Operator",
				remarks: "failed",
			});
		}
	});

	it("should return Internal Server Error - AddRFID", async () => {
		mockRepository.AddRFID = jest
			.fn()
			.mockRejectedValue(
				new HttpInternalServerError("Internal Server Error", [])
			);

		service = new MerchantService(mockRepository);

		const testData = {
			cpo_owner_id: 1,
			rfidCardTag: "12345678",
			admin_id: 1,
		};

		try {
			await service.AddRFID(
				testData.cpo_owner_id,
				testData.rfidCardTag,
				testData.admin_id
			);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpInternalServerError);
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: testData.admin_id,
				cpo_id: null,
				action: "ATTEMPT to ADD RFID to Charging Point Operator",
				remarks: "failed",
			});
		}
	});

	it("should successfully activate the CPO account - ChangeCPOAccountStatus", async () => {
		const result = await service.ChangeCPOAccountStatus("activate", 1, 1);

		expect(result).toBe("SUCCESS");
		expect(mockRepository.ActivateCPOAccount).toHaveBeenCalledTimes(1);
		expect(mockRepository.DeactivateCPOAccount).toHaveBeenCalledTimes(0);
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: `ACTIVATE Charging Point Operator account with id of ${1}`,
			remarks: "success",
		});
	});

	it("should successfully deactivate CPO account - ChangeCPOAccountStatus", async () => {
		const result = await service.ChangeCPOAccountStatus("deactivate", 1, 1);

		expect(result).toBe("SUCCESS");
		expect(mockRepository.DeactivateCPOAccount).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: `DEACTIVATE Charging Point Operator account with id of ${1}`,
			remarks: "success",
		});
		expect(mockRepository.ActivateCPOAccount).toHaveBeenCalledTimes(0);
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
	});

	it("should return NO_CHANGES_APPLIED - ChangeCPOAccountStatus", async () => {
		mockRepository.ActivateCPOAccount = jest
			.fn()
			.mockResolvedValue({ affectedRows: 0 });

		const result = await service.ChangeCPOAccountStatus("activate", 1, 1);

		expect(result).toBe("NO_CHANGES_APPLIED");
		expect(mockRepository.ActivateCPOAccount).toHaveBeenCalledTimes(1);
		expect(mockRepository.DeactivateCPOAccount).toHaveBeenCalledTimes(0);
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(0);
	});

	it("should return an error when ACTIVATING CPO account fails - ChangeCPOAccountStatus", async () => {
		mockRepository.ActivateCPOAccount = jest
			.fn()
			.mockRejectedValue(new HttpInternalServerError());

		try {
			await service.ChangeCPOAccountStatus("activate", 1, 1);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpInternalServerError);
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: `ATTEMPT to DEACTIVATE Charging Point Operator account`,
				remarks: "failed",
			});
		}
	});

	it("it should return BAD REQUEST when action is invalid - ChangeCPOAccountStatus", async () => {
		try {
			await service.ChangeCPOAccountStatus("invalid", 1, 1);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: `ATTEMPT to DEACTIVATE Charging Point Operator account`,
				remarks: "failed",
			});
		}
	});

	it("should register company detail - RegisterCompanyPartnerDetails", async () => {
		const GeneratePartyID = jest.spyOn(
			MerchantService.prototype,
			"GeneratePartyID"
		);

		GeneratePartyID.mockResolvedValue("ABC");

		axios.get.mockResolvedValue({
			data: {
				results: [
					{
						address_components: [
							{
								long_name: "Cabuyao",
								short_name: "Cabuyao",
								types: ["locality", "political"],
							},
							{
								long_name: "Laguna",
								short_name: "Laguna",
								types: ["administrative_area_level_2", "political"],
							},
							{
								long_name: "Calabarzon",
								short_name: "Calabarzon",
								types: ["administrative_area_level_1", "political"],
							},
							{
								long_name: "Philippines",
								short_name: "PH",
								types: ["country", "political"],
							},
						],
					},
				],
			},
		});

		const testData = {
			company_name: "ABC",
			address: "Laguna",
			id: 1,
		};

		const result = await service.RegisterCompanyPartnerDetails(
			testData.company_name,
			testData.address,
			testData.id
		);

		expect(result).toEqual({ party_id: "ABC", message: "SUCCESS" });
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.RegisterCompanyPartnerDetails).toHaveBeenCalledTimes(
			1
		);
		expect(service.GeneratePartyID).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: testData.id,
			cpo_id: null,
			action: "CREATED Company Partner Details",
			remarks: "success",
		});
		expect(mockRepository.GetCompanyPartnerDetails).toHaveBeenCalledTimes(0);
	});

	it("should return BAD REQUEST when LOCATION NOT FOUND - RegisterCompanyPartnerDetails", async () => {
		axios.get.mockResolvedValue({ data: { results: [] } });

		try {
			const testData = {
				company_name: "ABC",
				address: "Laguna",
				id: 1,
			};

			await service.RegisterCompanyPartnerDetails(
				testData.company_name,
				testData.address,
				testData.id
			);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("LOCATION_NOT_FOUND");
		}
	});

	it("should only call AuditTrail when result insertID is not set - RegisterCompanyPartnerDetails", async () => {
		mockRepository.RegisterCompanyPartnerDetails = jest
			.fn()
			.mockResolvedValue({ insertId: 0 });

		const testData = {
			company_name: "ABC",
			address: "Cabuyao, Laguna",
			id: 1,
		};

		axios.get.mockResolvedValue({
			data: {
				results: [
					{
						address_components: [
							{
								long_name: "Cabuyao",
								short_name: "Cabuyao",
								types: ["locality", "political"],
							},
							{
								long_name: "Laguna",
								short_name: "Laguna",
								types: ["administrative_area_level_2", "political"],
							},
							{
								long_name: "Calabarzon",
								short_name: "Calabarzon",
								types: ["administrative_area_level_1", "political"],
							},
							{
								long_name: "Philippines",
								short_name: "PH",
								types: ["country", "political"],
							},
						],
					},
				],
			},
		});

		await service.RegisterCompanyPartnerDetails(
			testData.company_name,
			testData.address,
			testData.id
		);

		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
	});

	it("should registers a Charging Point Operator successfully - RegisterCPO", async () => {
		// Setup
		mockRepository.RegisterCPO = jest
			.fn()
			.mockResolvedValue([[{ STATUS: "SUCCESS" }]]);
		service = new MerchantService(mockRepository);
		const testData = {
			username: "testuser",
			contact_email: "test@example.com",
			admin_id: 1,
		};

		// Execution
		const result = await service.RegisterCPO(testData);

		// Verification
		expect(result).toBe("SUCCESS");
		expect(mockRepository.RegisterCPO).toHaveBeenCalledWith({
			...testData,
			password: undefined,
		});
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: testData.admin_id,
			cpo_id: null,
			action: "REGISTER Charging Point Operator",
			remarks: "success",
		});
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
	});

	it("should return Bad Request - RegisterCPO", async () => {
		mockRepository.RegisterCPO = jest
			.fn()
			.mockResolvedValue([[{ STATUS: "ERROR" }]]);

		service = new MerchantService(mockRepository);

		const testData = {
			username: "testuser",
			contact_email: "test@example.com",
			admin_id: 1,
			// Add other required fields for your test case
		};

		await expect(service.RegisterCPO(testData)).rejects.toThrow(HttpBadRequest);
	});

	it("should result to Success in CheckRegisterCPO - CheckRegisterCPO", async () => {
		service = new MerchantService(mockRepository);

		const usernameResult = await service.CheckRegisterCPO(
			"username",
			"testuser"
		);
		const mobileNumberResult = await service.CheckRegisterCPO(
			"contact_number",
			"09231123312"
		);
		const mobileNumberResult2 = await service.CheckRegisterCPO(
			"contact_number",
			"+639112231123"
		);
		const emailResult = await service.CheckRegisterCPO(
			"contact_email",
			"email@gmail.com"
		);

		expect(usernameResult).toBe("SUCCESS");
		expect(mobileNumberResult).toBe("SUCCESS");
		expect(mobileNumberResult2).toBe("SUCCESS");
		expect(emailResult).toBe("SUCCESS");
	});

	it("should throw BAD REQUEST when username is invalid - CheckRegisterCPO", async () => {
		try {
			await service.CheckRegisterCPO("username", "testuser1!!!!");
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("INVALID_USERNAME");
		}
	});

	it("should throw BAD REQUEST when contact number is invalid - CheckRegisterCPO", async () => {
		try {
			await service.CheckRegisterCPO("contact_number", "08231123312");
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("INVALID_CONTACT_NUMBER");
		}
	});

	it("should throw BAD REQUEST when contact email is invalid - CheckRegisterCPO", async () => {
		try {
			await service.CheckRegisterCPO("contact_email", "08231123312");
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("INVALID_CONTACT_EMAIL");
		}
	});

	it("should topup successfully - Topup", async () => {
		const result = await service.Topup(1, 1000, 1);
		expect(result).toEqual({ status: "SUCCESS", new_balance: 2000 });
		expect(mockRepository.Topup).toHaveBeenCalledWith(1, 1000);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: `TOPUP to CPO with id of ${1}`,
			remarks: "success",
		});
	});

	it("should topup successfully - Topup", async () => {
		const result = await service.Topup(1, 1000, 1);
		expect(result).toEqual({ status: "SUCCESS", new_balance: 2000 });
		expect(mockRepository.Topup).toHaveBeenCalledWith(1, 1000);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: `TOPUP to CPO with id of ${1}`,
			remarks: "success",
		});
	});

	it("should throw bad request - INVALID AMOUNT - Topup", async () => {
		try {
			service = new MerchantService(mockRepository);

			await service.Topup(1, -1, 1);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(mockRepository.AuditTrail).toHaveBeenCalled();
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: `ATTEMPT to TOPUP to CPO with id of ${1}`,
				remarks: "failed",
			});
		}
	});

	it("should throw bad request when status is not SUCCESS - Topup", async () => {
		mockRepository.Topup = jest
			.fn()
			.mockResolvedValue([[{ STATUS: "FAILED" }]]);

		service = new MerchantService(mockRepository);

		try {
			await service.Topup(1, 1000, 1);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("FAILED");
			expect(mockRepository.Topup).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalled();
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: `ATTEMPT to TOPUP to CPO with id of ${1}`,
				remarks: "failed",
			});
		}
	});

	it("should update CPO successfully - UpdateCPOByID", async () => {
		service = new MerchantService(mockRepository);

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
		const result = await service.UpdateCPOByID(testData);

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

	it("should return SUCCESS even no changes applied - UpdateCPOByID", async () => {
		service = new MerchantService(mockRepository);

		const testData = {
			id: 1,
			data: {},
			admin_id: 1,
		};
		const result = await service.UpdateCPOByID(testData);

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

	it("should throw CPO_ID_DOES_NOT_EXIST when affectedRows is 0 - UpdateCPOByID", async () => {
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
		service = new MerchantService(mockRepository);

		await expect(service.UpdateCPOByID(testData)).rejects.toThrow(
			new HttpBadRequest("CPO_ID_DOES_NOT_EXISTS")
		);
	});

	it("should throw VALIDATION ERROR when property to update is INVALID - UpdateCPOByID", async () => {
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

		service = new MerchantService(mockRepository);

		await expect(service.UpdateCPOByID(testData)).rejects.toThrow(
			HttpBadRequest
		);
	});

	it("should return it exists - UpdateCPOByID", async () => {
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

		service = new MerchantService(mockRepository);

		try {
			await service.UpdateCPOByID(testData);
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

	it("should return an error when UpdateCPOByID fails - UpdateCPOByID", async () => {
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

		service = new MerchantService(mockRepository);
	});

	it("should successfully retrieve list of CPOs - GetCPOs", async () => {
		mockRepository.CountCPOs.mockResolvedValue([{ total_cpos: 1 }]);
		mockRepository.GetCPOs.mockResolvedValue([{ id: 1 }]);

		const result = await service.GetCPOs({ limit: 10, offset: 0 });

		expect(result).toBeTruthy();

		expect(result).toEqual({
			cpos: [{ id: 1 }],
			total_cpos_returned: 1,
			total_cpos: 1,
			limit: 10,
			offset: 0,
		});
	});

	it("should successfully search CPO by name - SearchCPOByName", async () => {
		mockRepository.SearchCPOByName.mockResolvedValue([{ id: 1 }]);

		const result = await service.SearchCPOByName("test");

		expect(result).toEqual([{ id: 1 }]);
		expect(mockRepository.GetCPOs).toHaveBeenCalledTimes(0);
		expect(mockRepository.SearchCPOByName).toHaveBeenCalledTimes(1);
	});

	it("should successfully return all of CPOs when name to search is empty - SearchCPOByName", async () => {
		mockRepository.GetCPOs.mockResolvedValue([{ id: 1 }]);

		const result = await service.SearchCPOByName("");

		expect(result).toEqual([{ id: 1 }]);
		expect(mockRepository.GetCPOs).toHaveBeenCalledTimes(1);
		expect(mockRepository.SearchCPOByName).toHaveBeenCalledTimes(0);
	});

	it("should succesfully return TOPUP by ID - GetTopupByID", async () => {
		mockRepository.GetTopupByID.mockResolvedValue([{ id: 1 }]);

		const result = await service.GetTopupByID(1);

		expect(result).toEqual([{ id: 1 }]);
		expect(mockRepository.GetTopupByID).toHaveBeenCalledTimes(1);
	});

	it("should succesfully VOID TOPUP - VoidTopup", async () => {
		mockRepository.VoidTopup.mockResolvedValue([
			[{ STATUS: "SUCCESS", current_balance: 1500, reference_number: 1 }],
		]);

		const result = await service.VoidTopup(1, 1);

		expect(result).toEqual({
			status: "SUCCESS",
			current_balance: 1500,
			reference_number: 1,
		});
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: `VOID Topup with reference ID of 1`,
			remarks: "success",
		});
	});

	it("should throw BAD REQUEST when status is not SUCCESS - VoidTopup", async () => {
		mockRepository.VoidTopup.mockResolvedValue([[{ STATUS: "FAIL" }]]);

		try {
			await service.VoidTopup(1, 1);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("FAIL");
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: "ATTEMPT to VOID Topup",
				remarks: "failed",
			});
		}
	});

	it("should succesfully return list of COMPANY PARTNER DETAILS", async () => {
		mockRepository.GetCompanyPartnerDetails.mockResolvedValue([{ id: 1 }]);

		const result = await service.GetCompanyPartnerDetails();

		expect(result).toEqual([{ id: 1 }]);
		expect(mockRepository.GetCompanyPartnerDetails).toHaveBeenCalledTimes(1);
	});

	it("should succesfully update company partner details - UpdateCompanyPartnerDetails", async () => {
		mockRepository.UpdateCompanyPartnerDetails.mockResolvedValue({
			affectedRows: 1,
		});

		axios.get.mockResolvedValue({
			data: {
				results: [
					{
						address_components: [
							{
								long_name: "Cabuyao",
								short_name: "Cabuyao",
								types: ["locality", "political"],
							},
							{
								long_name: "Laguna",
								short_name: "Laguna",
								types: ["administrative_area_level_2", "political"],
							},
							{
								long_name: "Calabarzon",
								short_name: "Calabarzon",
								types: ["administrative_area_level_1", "political"],
							},
							{
								long_name: "Philippines",
								short_name: "PH",
								types: ["country", "political"],
							},
						],
					},
				],
			},
		});

		const result = await service.UpdateCompanyPartnerDetails({
			address: "Address",
			id: 1,
			admin_id: 2,
		});

		expect(result).toBe("SUCCESS");
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 2,
			cpo_id: null,
			action: "UPDATE Company Partner Details",
			remarks: "success",
		});
	});

	it("should throw BAD REQUEST when address components is undefined or null - UpdateCompanyPartnerDetails", async () => {
		mockRepository.UpdateCompanyPartnerDetails.mockResolvedValue({
			affectedRows: 1,
		});
		axios.get.mockResolvedValue({
			data: {
				results: [],
			},
		});

		try {
			await service.UpdateCompanyPartnerDetails({
				address: "Address",
				id: 1,
				admin_id: 2,
			});
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("LOCATION_NOT_FOUND");
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 2,
				cpo_id: null,
				action: "ATTEMPT to update company partner details",
				remarks: "failed",
			});
		}
	});

	it("should not throw and error when there are no affected data when attempting to update company partner details - UpdateCompanyPartnerDetails", async () => {
		mockRepository.UpdateCompanyPartnerDetails.mockResolvedValue({
			affectedRows: 0,
		});

		axios.get.mockResolvedValue({
			data: {
				results: [
					{
						address_components: [
							{
								long_name: "Cabuyao",
								short_name: "Cabuyao",
								types: ["locality", "political"],
							},
							{
								long_name: "Laguna",
								short_name: "Laguna",
								types: ["administrative_area_level_2", "political"],
							},
							{
								long_name: "Calabarzon",
								short_name: "Calabarzon",
								types: ["administrative_area_level_1", "political"],
							},
							{
								long_name: "Philippines",
								short_name: "PH",
								types: ["country", "political"],
							},
						],
					},
				],
			},
		});

		const result = await service.UpdateCompanyPartnerDetails({
			address: "Address",
			id: 1,
			admin_id: 2,
		});

		expect(result).toEqual({ affectedRows: 0 });
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 2,
			cpo_id: null,
			action: "ATTEMPT to update company partner details",
			remarks: "failed",
		});
	});
});
