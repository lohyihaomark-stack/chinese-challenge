const fs = require('fs');
const path = require('path');
const result = [
  'CWD: ' + process.cwd(),
  'EXISTS: ' + fs.existsSync('./src/components/TeacherDashboard.jsx'),
  'NODE: ' + process.version,
];
fs.writeFileSync('C:\\Users\\yihao\\check_result.txt', result.join('\n'));
