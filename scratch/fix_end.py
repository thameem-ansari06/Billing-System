
import os

path = r'd:\AR_Automation\frontend\src\components\PaymentsReceivedTab.jsx'
with open(path, 'rb') as f:
    content = f.read()

# Fix the duplicate return at the end
# We look for the sequence );\r\n};\r\n\r\n  );\r\n};
target = b'  );\r\n};\r\n\r\n  );\r\n};'
if target in content:
    content = content.replace(target, b'  );\r\n};')
    print("Fixed duplicate return")
else:
    # Try with \n instead of \r\n
    target = b'  );\n};\n\n  );\n};'
    if target in content:
        content = content.replace(target, b'  );\n};')
        print("Fixed duplicate return (LF)")
    else:
        print("Target not found in binary")

with open(path, 'wb') as f:
    f.write(content)
