const equipmentForm =
    document.getElementById("equipmentForm");

const equipmentMessage =
    document.getElementById("equipmentMessage");

const equipmentSubmitButton =
    document.getElementById("equipmentSubmitButton");

function showEquipmentMessage(message, type) {
    equipmentMessage.textContent = message;
    equipmentMessage.className = "form-message";

    if (type) {
        equipmentMessage.classList.add(type);
    }
}

async function addEquipment(event) {
    event.preventDefault();

    const equipmentName =
        document.getElementById("equipmentName").value.trim();

    const category =
        document.getElementById("category").value.trim();

    const assetCode =
        document.getElementById("assetCode")
            .value
            .trim()
            .toUpperCase();

    const condition =
        document.getElementById("condition").value;

    showEquipmentMessage("", "");

    if (!equipmentName) {
        showEquipmentMessage(
            "Equipment name is required.",
            "error"
        );
        return;
    }

    if (!category) {
        showEquipmentMessage(
            "Equipment category is required.",
            "error"
        );
        return;
    }

    if (!assetCode) {
        showEquipmentMessage(
            "Asset code is required.",
            "error"
        );
        return;
    }

    equipmentSubmitButton.disabled = true;
    equipmentSubmitButton.textContent = "Saving...";

    const { error } = await supabaseClient
        .from("equipment")
        .insert({
            equipment_name: equipmentName,
            category: category,
            asset_code: assetCode,
            condition: condition,
            availability: "Available"
        });

    equipmentSubmitButton.disabled = false;
    equipmentSubmitButton.textContent = "Add Equipment";

    if (error) {
        console.error("Add equipment error:", error);

        if (
            error.code === "23505" ||
            error.message.toLowerCase().includes("duplicate")
        ) {
            showEquipmentMessage(
                "That asset code already exists. Enter a unique asset code.",
                "error"
            );
        } else {
            showEquipmentMessage(
                "Unable to save equipment: " + error.message,
                "error"
            );
        }

        return;
    }

    showEquipmentMessage(
        "Equipment added successfully.",
        "success"
    );

    equipmentForm.reset();

document.getElementById("condition").value = "Good";

loadEquipment();
}

if (equipmentForm) {
    equipmentForm.addEventListener(
        "submit",
        addEquipment
    );
}

let equipmentRecords = [];

async function loadEquipment() {
    const tableBody =
        document.getElementById("equipmentTableBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">
                Loading equipment...
            </td>
        </tr>
    `;

    const { data, error } = await supabaseClient
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Load equipment error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Unable to load equipment: ${escapeHTML(error.message)}
                </td>
            </tr>
        `;

        return;
    }

    equipmentRecords = data || [];

    applyEquipmentFilters();
    updateEquipmentDashboard();
    populateAvailableEquipment();
}

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}

function displayEquipment(records) {
    const tableBody =
        document.getElementById("equipmentTableBody");

    tableBody.innerHTML = "";

    if (records.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No matching equipment records.
                </td>
            </tr>
        `;

        return;
    }

    records.forEach((equipment) => {
        const row = document.createElement("tr");

        const statusClass =
            equipment.availability === "Available"
                ? "status-available"
                : "status-borrowed";

        row.innerHTML = `
            <td>${escapeHTML(equipment.asset_code)}</td>

            <td>
                ${escapeHTML(equipment.equipment_name)}
            </td>

            <td>${escapeHTML(equipment.category)}</td>

            <td>${escapeHTML(equipment.condition)}</td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${escapeHTML(equipment.availability)}
                </span>
            </td>

  <td>
    <div class="action-buttons">
        <button
            type="button"
            class="action-button edit-button"
            onclick="startEquipmentEdit(${equipment.id})"
        >
            Edit
        </button>

        <button
            type="button"
            class="action-button delete-button"
            onclick="deleteEquipment(
                ${equipment.id},
                '${escapeHTML(equipment.equipment_name)}'
            )"
        >
            Delete
        </button>
    </div>
</td>
        `;

        tableBody.appendChild(row);
    });
}

function applyEquipmentFilters() {
    const searchInput =
        document.getElementById("equipmentSearch");

    const filterInput =
        document.getElementById("availabilityFilter");

    const searchText =
        searchInput.value.trim().toLowerCase();

    const selectedAvailability = filterInput.value;

    const filteredRecords = equipmentRecords.filter(
        (equipment) => {
            const equipmentName =
                equipment.equipment_name.toLowerCase();

            const assetCode =
                equipment.asset_code.toLowerCase();

            const matchesSearch =
                equipmentName.includes(searchText) ||
                assetCode.includes(searchText);

            const matchesAvailability =
                selectedAvailability === "All" ||
                equipment.availability ===
                    selectedAvailability;

            return matchesSearch && matchesAvailability;
        }
    );

    displayEquipment(filteredRecords);
}

function updateEquipmentDashboard() {
    const total = equipmentRecords.length;

    const available = equipmentRecords.filter(
        (equipment) =>
            equipment.availability === "Available"
    ).length;

    const borrowed = equipmentRecords.filter(
        (equipment) =>
            equipment.availability === "Borrowed"
    ).length;

    document.getElementById(
        "totalEquipment"
    ).textContent = total;

    document.getElementById(
        "availableEquipment"
    ).textContent = available;

    document.getElementById(
        "borrowedEquipment"
    ).textContent = borrowed;
}

function populateAvailableEquipment() {
    const equipmentSelect =
        document.getElementById("borrowEquipment");

    equipmentSelect.innerHTML = `
        <option value="">
            Select available equipment
        </option>
    `;

    const availableRecords = equipmentRecords.filter(
        (equipment) =>
            equipment.availability === "Available"
    );

    availableRecords.forEach((equipment) => {
        const option = document.createElement("option");

        option.value = equipment.id;

        option.textContent =
            `${equipment.asset_code} - ` +
            `${equipment.equipment_name}`;

        equipmentSelect.appendChild(option);
    });
}

const equipmentSearch =
    document.getElementById("equipmentSearch");

const availabilityFilter =
    document.getElementById("availabilityFilter");

if (equipmentSearch) {
    equipmentSearch.addEventListener(
        "input",
        applyEquipmentFilters
    );
}

if (availabilityFilter) {
    availabilityFilter.addEventListener(
        "change",
        applyEquipmentFilters
    );
}

loadEquipment();

function startEquipmentEdit(id) {
    const equipment = equipmentRecords.find(
        (record) => record.id === id
    );

    if (!equipment) {
        showEquipmentMessage(
            "Equipment record was not found.",
            "error"
        );
        return;
    }

    document.getElementById("equipmentId").value =
        equipment.id;

    document.getElementById("equipmentName").value =
        equipment.equipment_name;

    document.getElementById("category").value =
        equipment.category;

    document.getElementById("assetCode").value =
        equipment.asset_code;

    document.getElementById("condition").value =
        equipment.condition;

    document.getElementById(
        "equipmentFormTitle"
    ).textContent = "Edit Equipment";

    equipmentSubmitButton.textContent =
        "Update Equipment";

    document.getElementById(
        "cancelEditButton"
    ).classList.remove("hidden");

    showEquipmentMessage(
        "You are editing " + equipment.equipment_name + ".",
        ""
    );

    document.getElementById(
        "equipmentName"
    ).focus();

    document.getElementById("equipment").scrollIntoView({
        behavior: "smooth"
    });
}

function cancelEquipmentEdit() {
    equipmentForm.reset();

    document.getElementById("equipmentId").value = "";

    document.getElementById("condition").value = "Good";

    document.getElementById(
        "equipmentFormTitle"
    ).textContent = "Add New Equipment";

    equipmentSubmitButton.textContent =
        "Add Equipment";

    document.getElementById(
        "cancelEditButton"
    ).classList.add("hidden");

    showEquipmentMessage("", "");
}

const cancelEditButton =
    document.getElementById("cancelEditButton");

if (cancelEditButton) {
    cancelEditButton.addEventListener(
        "click",
        cancelEquipmentEdit
    );
}

async function deleteEquipment(id, equipmentName) {
    const confirmed = window.confirm(
        `Are you sure you want to delete "${equipmentName}"?`
    );

    if (!confirmed) {
        return;
    }

    showEquipmentMessage(
        "Deleting equipment...",
        ""
    );

    const { error } = await supabaseClient
        .from("equipment")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(
            "Delete equipment error:",
            error
        );

        if (
            error.code === "23503" ||
            error.message
                .toLowerCase()
                .includes("foreign key")
        ) {
            showEquipmentMessage(
                "This equipment cannot be deleted because " +
                "it already has borrowing transaction records.",
                "error"
            );
        } else {
            showEquipmentMessage(
                "Unable to delete equipment: " +
                error.message,
                "error"
            );
        }

        return;
    }

    const currentEditId =
        document.getElementById("equipmentId").value;

    if (currentEditId === String(id)) {
        cancelEquipmentEdit();
    }

    showEquipmentMessage(
        `"${equipmentName}" was deleted successfully.`,
        "success"
    );

    await loadEquipment();
}