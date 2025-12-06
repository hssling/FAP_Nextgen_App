import { openDB } from 'idb';

const DB_NAME = 'fap_nextgen_db_v2';
const DB_VERSION = 1;

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Families Store
            if (!db.objectStoreNames.contains('families')) {
                const familyStore = db.createObjectStore('families', { keyPath: 'id', autoIncrement: true });
                familyStore.createIndex('village', 'village');
            }

            // Members Store
            if (!db.objectStoreNames.contains('members')) {
                const memberStore = db.createObjectStore('members', { keyPath: 'id', autoIncrement: true });
                memberStore.createIndex('familyId', 'familyId');
            }

            // Visits/Assessments Store
            if (!db.objectStoreNames.contains('visits')) {
                const visitStore = db.createObjectStore('visits', { keyPath: 'id', autoIncrement: true });
                visitStore.createIndex('familyId', 'familyId');
                visitStore.createIndex('date', 'date');
            }

            // Community/Villages Store
            if (!db.objectStoreNames.contains('villages')) {
                db.createObjectStore('villages', { keyPath: 'id', autoIncrement: true });
            }

            // Reflections Store
            if (!db.objectStoreNames.contains('reflections')) {
                const reflectionStore = db.createObjectStore('reflections', { keyPath: 'id', autoIncrement: true });
                reflectionStore.createIndex('studentId', 'studentId');
                reflectionStore.createIndex('familyId', 'familyId');
            }
        },
    });
};

export const addReflection = async (data) => {
    const db = await initDB();
    return db.add('reflections', { ...data, createdAt: new Date() });
};

export const getReflections = async () => {
    const db = await initDB();
    return db.getAll('reflections');
};

export const getFamilies = async () => {
    const db = await initDB();
    return db.getAll('families');
};

export const getFamily = async (id) => {
    const db = await initDB();
    return db.get('families', parseInt(id));
};

export const addFamily = async (family) => {
    const db = await initDB();
    return db.add('families', { ...family, createdAt: new Date() });
};

export const getMembers = async (familyId) => {
    const db = await initDB();
    return db.getAllFromIndex('members', 'familyId', parseInt(familyId));
};

export const getAllMembers = async () => {
    const db = await initDB();
    return db.getAll('members');
};

export const addMember = async (member) => {
    const db = await initDB();
    return db.add('members', member);
};

export const updateMember = async (member) => {
    const db = await initDB();
    return db.put('members', member);
};



export const getVillages = async () => {
    const db = await initDB();
    return db.getAll('villages');
};

export const addVillage = async (village) => {
    const db = await initDB();
    return db.add('villages', { ...village, updatedAt: new Date() });
};

export const updateVillage = async (village) => {
    const db = await initDB();
    return db.put('villages', { ...village, updatedAt: new Date() });
};

