const fs = require("fs");
const files = [
  "src/app/admin/page.tsx",
  "src/app/admin/services/page.tsx",
  "src/app/admin/providers/page.tsx",
  "src/app/admin/services/[id]/page.tsx",
  "src/app/admin/providers/[id]/page.tsx",
];

const appendStr = "\nexport const dynamic = 'force-dynamic';\n";

for (const f of files) {
  let content = fs.readFileSync(f, "utf-8");
  if (!content.includes(appendStr.trim())) {
    const importMatch = content.match(/.*?(?=export default)/s);
    if (importMatch) {
       content = content.replace(importMatch[0], importMatch[0] + appendStr);
       fs.writeFileSync(f, content, "utf-8");
       console.log("Updated", f);
    }
  }
}
