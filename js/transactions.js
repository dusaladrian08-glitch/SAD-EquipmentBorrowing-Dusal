const borrowingForm =
    document.getElementById("borrowingForm");

const borrowingMessage =
    document.getElementById("borrowingMessage");

function showBorrowingMessage(message, type) {
    borrowingMessage.textContent = message;
    borrowingMessage.className =
        "form-message full-width";

    if (type) {
        borrowingMessage.classList.add(type);
    }
}

function getLocalDate() {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function setDefaultBorrowingDate() {
    const dateBorrowedInput =
        document.getElementById("dateBorrowed");

    if (dateBorrowedInput) {
        dateBorrowedInput.value = getLocalDate();
    }
}

async function recordBorrowing(event) {
    event.preventDefault();

    const borrowerName =
        document.getElementById("borrowerName")
            .value
            .trim();

    const borrowerType =
        document.getElementById("borrowerType").value;

    const department =
        document.getElementById("department")
            .value
            .trim();

    const equipmentId =
        Number(
            document.getElementById(
                "borrowEquipment"
            ).value
        );

    const dateBorrowed =
        document.getElementById("dateBorrowed").value;

    const dueDate =
        document.getElementById("dueDate").value;

    const submitButton =
        borrowingForm.querySelector(
            'button[type="submit"]'
        );

    showBorrowingMessage("", "");

    if (!borrowerName) {
        showBorrowingMessage(
            "Borrower name is required.",
            "error"
        );
        return;
    }

    if (!borrowerType) {
        showBorrowingMessage(
            "Please select a borrower type.",
            "error"
        );
        return;
    }

    if (!department) {
        showBorrowingMessage(
            "Department is required.",
            "error"
        );
        return;
    }

    if (!equipmentId) {
        showBorrowingMessage(
            "Please select available equipment.",
            "error"
        );
        return;
    }

    if (!dateBorrowed || !dueDate) {
        showBorrowingMessage(
            "Date borrowed and due date are required.",
            "error"
        );
        return;
    }

    if (dueDate < dateBorrowed) {
        showBorrowingMessage(
            "Due date cannot be earlier than " +
            "the borrowing date.",
            "error"
        );
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Saving Transaction...";

    /*
     * Check the equipment again before saving.
     * This prevents already-borrowed equipment
     * from being borrowed a second time.
     */
    const {
        data: equipment,
        error: equipmentCheckError
    } = await supabaseClient
        .from("equipment")
        .select("id, equipment_name, availability")
        .eq("id", equipmentId)
        .single();

    if (equipmentCheckError) {
        console.error(
            "Equipment check error:",
            equipmentCheckError
        );

        showBorrowingMessage(
            "Unable to check the selected equipment.",
            "error"
        );

        submitButton.disabled = false;
        submitButton.textContent =
            "Save Borrowing Transaction";

        return;
    }

    if (equipment.availability !== "Available") {
        showBorrowingMessage(
            "This equipment is no longer available.",
            "error"
        );

        submitButton.disabled = false;
        submitButton.textContent =
            "Save Borrowing Transaction";

        await loadEquipment();
        return;
    }

    /*
     * Obtain the currently authenticated user.
     */
    const {
        data: userData,
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
        console.error("User error:", userError);

        showBorrowingMessage(
            "Your login session has expired. " +
            "Please log in again.",
            "error"
        );

        submitButton.disabled = false;
        submitButton.textContent =
            "Save Borrowing Transaction";

        return;
    }

    /*
     * Save the borrowing transaction.
     */
    const {
        data: newTransaction,
        error: transactionError
    } = await supabaseClient
        .from("borrow_transactions")
        .insert({
            equipment_id: equipmentId,
            borrower_name: borrowerName,
            borrower_type: borrowerType,
            department: department,
            date_borrowed: dateBorrowed,
            due_date: dueDate,
            date_returned: null,
            status: "Borrowed",
            user_id: userData.user.id
        })
        .select()
        .single();

    if (transactionError) {
        console.error(
            "Transaction error:",
            transactionError
        );

        showBorrowingMessage(
            "Unable to save transaction: " +
            transactionError.message,
            "error"
        );

        submitButton.disabled = false;
        submitButton.textContent =
            "Save Borrowing Transaction";

        return;
    }

    /*
     * Change equipment availability to Borrowed.
     * The extra condition ensures that only an
     * Available record can be updated.
     */
    const {
        data: updatedEquipment,
        error: updateError
    } = await supabaseClient
        .from("equipment")
        .update({
            availability: "Borrowed"
        })
        .eq("id", equipmentId)
        .eq("availability", "Available")
        .select();

    if (
        updateError ||
        !updatedEquipment ||
        updatedEquipment.length === 0
    ) {
        console.error(
            "Availability update error:",
            updateError
        );

        /*
         * Remove the newly created transaction
         * because the equipment update failed.
         */
        await supabaseClient
            .from("borrow_transactions")
            .delete()
            .eq("id", newTransaction.id);

        showBorrowingMessage(
            "The equipment could not be borrowed. " +
            "Please try again.",
            "error"
        );

        submitButton.disabled = false;
        submitButton.textContent =
            "Save Borrowing Transaction";

        await loadEquipment();
        return;
    }

    borrowingForm.reset();
    setDefaultBorrowingDate();

    showBorrowingMessage(
        `${equipment.equipment_name} was successfully ` +
        `borrowed by ${borrowerName}.`,
        "success"
    );

    submitButton.disabled = false;
    submitButton.textContent =
        "Save Borrowing Transaction";

    await loadEquipment();
}

if (borrowingForm) {
    borrowingForm.addEventListener(
        "submit",
        recordBorrowing
    );

    setDefaultBorrowingDate();
}

let transactionRecords = [];

function escapeTransactionHTML(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}

function determineTransactionStatus(transaction) {
    if (
        transaction.status === "Returned" ||
        transaction.date_returned
    ) {
        return "Returned";
    }

    const today = getLocalDate();

    if (today > transaction.due_date) {
        return "Overdue";
    }

    return "Borrowed";
}

function formatDisplayDate(dateValue) {
    if (!dateValue) {
        return "—";
    }

    const parts = dateValue.split("-");

    if (parts.length !== 3) {
        return dateValue;
    }

    return `${parts[1]}/${parts[2]}/${parts[0]}`;
}
async function updateOverdueTransactions() {
    const today = getLocalDate();

    const { error } = await supabaseClient
        .from("borrow_transactions")
        .update({
            status: "Overdue"
        })
        .lt("due_date", today)
        .neq("status", "Returned")
        .is("date_returned", null);

    if (error) {
        console.error(
            "Overdue update error:",
            error
        );
    }
}
async function loadTransactions() {
    await updateOverdueTransactions();
    const tableBody =
        document.getElementById(
            "transactionTableBody"
        );

    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="empty-state">
                Loading transactions...
            </td>
        </tr>
    `;

    const { data, error } = await supabaseClient
        .from("borrow_transactions")
        .select(`
            *,
            equipment (
                id,
                equipment_name,
                asset_code
            )
        `)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(
            "Load transactions error:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    Unable to load transactions:
                    ${escapeTransactionHTML(error.message)}
                </td>
            </tr>
        `;

        return;
    }

    transactionRecords = (data || []).map(
        (transaction) => {
            return {
                ...transaction,
                display_status:
                    determineTransactionStatus(transaction)
            };
        }
    );

    applyTransactionFilters();
    updateTransactionDashboard();
}

function displayTransactions(records) {
    const tableBody =
        document.getElementById(
            "transactionTableBody"
        );

    tableBody.innerHTML = "";

    if (records.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    No matching transactions found.
                </td>
            </tr>
        `;

        return;
    }

   records.forEach((transaction) => {
    const row = document.createElement("tr");

    if (transaction.display_status === "Overdue") {
        row.classList.add("overdue-row");
    }

    const equipmentName =
        transaction.equipment
            ? transaction.equipment.equipment_name
            : "Unknown Equipment";

        const assetCode =
            transaction.equipment
                ? transaction.equipment.asset_code
                : "No Code";

        let statusClass = "status-borrowed";

        if (transaction.display_status === "Returned") {
            statusClass = "status-returned";
        }

        if (transaction.display_status === "Overdue") {
            statusClass = "status-overdue";
        }

      const actionContent =
    transaction.display_status === "Returned"
        ? `
            <span class="returned-label">
                Completed
            </span>
        `
        : transaction.equipment
            ? `
                <button
                    type="button"
                    class="action-button return-button"
                    onclick="returnEquipment(
                        ${transaction.id},
                        ${transaction.equipment.id}
                    )"
                >
                    Return Equipment
                </button>
            `
            : `
                <span class="action-placeholder">
                    Equipment unavailable
                </span>
            `;

        row.innerHTML = `
            <td>
                <strong>
                    ${escapeTransactionHTML(equipmentName)}
                </strong>

                <div class="table-subtext">
                    ${escapeTransactionHTML(assetCode)}
                </div>
            </td>

            <td>
                ${escapeTransactionHTML(
                    transaction.borrower_name
                )}
            </td>

            <td>
                ${escapeTransactionHTML(
                    transaction.borrower_type
                )}
            </td>

            <td>
                ${escapeTransactionHTML(
                    transaction.department
                )}
            </td>

            <td>
                ${formatDisplayDate(
                    transaction.date_borrowed
                )}
            </td>

            <td>
                ${formatDisplayDate(
                    transaction.due_date
                )}
            </td>

            <td>
                ${formatDisplayDate(
                    transaction.date_returned
                )}
            </td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${transaction.display_status}
                </span>
            </td>

            <td>
                ${actionContent}
            </td>
        `;

        tableBody.appendChild(row);
    });
}
async function returnEquipment(
    transactionId,
    equipmentId
) {
    const transaction = transactionRecords.find(
        (record) => record.id === transactionId
    );

    if (!transaction) {
        alert("Transaction record was not found.");
        return;
    }

    if (
        transaction.status === "Returned" ||
        transaction.date_returned
    ) {
        alert(
            "This equipment has already been returned."
        );
        return;
    }

    const equipmentName =
        transaction.equipment
            ? transaction.equipment.equipment_name
            : "this equipment";

    const confirmed = window.confirm(
        `Confirm the return of "${equipmentName}"?`
    );

    if (!confirmed) {
        return;
    }

    const returnDate = getLocalDate();

    /*
     * Update the borrowing transaction.
     */
    const {
        data: updatedTransaction,
        error: transactionError
    } = await supabaseClient
        .from("borrow_transactions")
        .update({
            date_returned: returnDate,
            status: "Returned"
        })
        .eq("id", transactionId)
        .neq("status", "Returned")
        .select();

    if (transactionError) {
        console.error(
            "Return transaction error:",
            transactionError
        );

        alert(
            "Unable to return equipment: " +
            transactionError.message
        );

        return;
    }

    if (
        !updatedTransaction ||
        updatedTransaction.length === 0
    ) {
        alert(
            "This transaction has already been returned."
        );

        await loadTransactions();
        return;
    }

    /*
     * Change the equipment to Available.
     */
    const { error: equipmentError } =
        await supabaseClient
            .from("equipment")
            .update({
                availability: "Available"
            })
            .eq("id", equipmentId);

    if (equipmentError) {
        console.error(
            "Equipment availability error:",
            equipmentError
        );

        /*
         * Restore the transaction if the equipment
         * availability update fails.
         */
        await supabaseClient
            .from("borrow_transactions")
            .update({
                date_returned: null,
                status: "Borrowed"
            })
            .eq("id", transactionId);

        alert(
            "The equipment availability could not be " +
            "updated. The return was cancelled."
        );

        await loadTransactions();
        return;
    }

    alert(
        `${equipmentName} was returned successfully.`
    );

    await loadEquipment();
    await loadTransactions();
}

function applyTransactionFilters() {
    const searchInput =
        document.getElementById(
            "transactionSearch"
        );

    const filterInput =
        document.getElementById("statusFilter");

    const searchText =
        searchInput.value.trim().toLowerCase();

    const selectedStatus = filterInput.value;

    const filteredRecords =
        transactionRecords.filter(
            (transaction) => {
                const borrowerName =
                    transaction.borrower_name
                        .toLowerCase();

                const equipmentName =
                    transaction.equipment
                        ? transaction.equipment
                            .equipment_name
                            .toLowerCase()
                        : "";

                const assetCode =
                    transaction.equipment
                        ? transaction.equipment
                            .asset_code
                            .toLowerCase()
                        : "";

                const matchesSearch =
                    borrowerName.includes(searchText) ||
                    equipmentName.includes(searchText) ||
                    assetCode.includes(searchText);

                const matchesStatus =
                    selectedStatus === "All" ||
                    transaction.display_status ===
                        selectedStatus;

                return matchesSearch && matchesStatus;
            }
        );

    displayTransactions(filteredRecords);
}

function updateTransactionDashboard() {
    const returnedCount =
        transactionRecords.filter(
            (transaction) =>
                transaction.display_status ===
                "Returned"
        ).length;

    const overdueCount =
        transactionRecords.filter(
            (transaction) =>
                transaction.display_status ===
                "Overdue"
        ).length;

    document.getElementById(
        "returnedTransactions"
    ).textContent = returnedCount;

    document.getElementById(
        "overdueTransactions"
    ).textContent = overdueCount;
}

const transactionSearch =
    document.getElementById("transactionSearch");

const statusFilter =
    document.getElementById("statusFilter");

if (transactionSearch) {
    transactionSearch.addEventListener(
        "input",
        applyTransactionFilters
    );
}

if (statusFilter) {
    statusFilter.addEventListener(
        "change",
        applyTransactionFilters
    );
}

loadTransactions();