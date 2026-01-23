import Papa from 'papaparse';
import { initProductDatabase } from './productService.js';

const parseCsvFromText = (csvText) => {
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                const required = ['name', 'price', 'weight', 'category_id', 'description'];
                const headers = results.meta.fields;

                const missing = required.filter(col => !headers.includes(col));
                if (missing.length > 0) {
                    return reject(`Missing columns: ${missing.join(', ')}`);
                }
                const extra = headers.filter(col => !required.includes(col));
                if (extra.length > 0) {
                    return reject(`Forbidden columns found: ${extra.join(', ')}. Only [${required.join(', ')}] are allowed.`);
                }
                if (results.errors && results.errors.length > 0) {
                    const firstErr = results.errors[0];
                    return reject(`Invalid CSV structure in ${firstErr.row + 1}: ${firstErr.message}`);
                }
                const cleanedData = results.data.map((row, index) => {
                    const rowValues = Object.values(row);
                    if (rowValues.length > headers.length) {
                        return reject(`Row ${index + 1} contains too much data.`);
                    }
                    if (!row.name || row.price === undefined || row.weight === undefined || !row.category_id) {
                        return reject(`Row ${index + 1} contains incomplete data.`);
                    }

                    return {
                        ...row,
                        description: row.description ? String(row.description).trim() : ""
                    };
                });

                resolve(cleanedData);
            },
            error: (error) => reject(error.message)
        });
    });
};

export const processCSVInitialization = async (file, token) => {
    if (!file) {
        throw ("No file selected.");
    }
    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
    if (!isCsv) {
        throw ("Selected file must be a CSV.");
    }
    if (file.size === 0) {
        throw ("The selected file is empty.");
    }
    const text = await file.text();
    const parsedProducts = await parseCsvFromText(text);
    return await initProductDatabase({ products: parsedProducts }, token);
};