const fs = require('fs');

let code = fs.readFileSync('src/pages/admin/Billing.jsx', 'utf8');

// Add import
if (!code.includes("import Pagination from '../../components/Pagination';")) {
  code = code.replace(
    /import Accounting from '\.\/Accounting';/,
    "import Accounting from './Accounting';\nimport Pagination from '../../components/Pagination';"
  );
}

// Remove PaginationControl definition
const start = code.indexOf('const PaginationControl = ');
if (start !== -1) {
  const end = code.indexOf('};', start) + 2;
  code = code.substring(0, start) + code.substring(end);
}

// Replace all usages
code = code.replace(
  /<PaginationControl\s+currentPage={([^}]+)}\s+totalItems={([^}]+)}\s+pageSize={([^}]+)}\s+onPageChange={([^}]+)}\s*\/>/g,
  '<Pagination currentPage={$1} totalPages={Math.ceil(($2) / ($3))} limit={$3} onPageChange={$4} />'
);

fs.writeFileSync('src/pages/admin/Billing.jsx', code);
console.log('Replaced PaginationControl with Pagination successfully.');
