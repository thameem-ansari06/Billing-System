
import re

def check_jsx_balance(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Improved regex to catch self-closing tags more reliably
    # <Tag /> or <Tag>
    tag_pattern = re.compile(r'<(/?)([A-Z][a-zA-Z0-9]*|div|p|h1|h2|h3|h4|span|label|input|button|a|img|br|hr)(?:\s[^>]*?|(?=\s|>))(/?)>', re.MULTILINE)
    
    stack = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        # Remove strings and comments to avoid false positives
        clean_line = re.sub(r'"{[^}]*}"|"[^"]*"|\'{[^\}]*}\'|\'[^\']*\'', '""', line)
        clean_line = re.sub(r'\{/\*.*?\*/\}', '', clean_line)
        
        for m in tag_pattern.finditer(clean_line):
            is_closing = m.group(1) == '/'
            tag_name = m.group(2)
            is_self_closing = m.group(3) == '/'
            
            # Common self-closing tags in HTML
            if tag_name in ['input', 'img', 'br', 'hr']:
                is_self_closing = True
            
            if is_self_closing:
                continue
                
            if is_closing:
                if not stack:
                    print(f"Extra closing tag </{tag_name}> at line {i+1}")
                else:
                    last = stack.pop()
                    if last['name'] != tag_name:
                        print(f"Mismatch: <{last['name']}> at line {last['line']} closed by </{tag_name}> at line {i+1}")
                        # If mismatch, try to recover by pushing back if it looks like a missed closure
            else:
                stack.append({'name': tag_name, 'line': i+1})

    for tag in stack:
        print(f"Unclosed tag <{tag['name']}> at line {tag['line']}")

check_jsx_balance(r'd:\AR_Automation\frontend\src\components\PaymentsReceivedTab.jsx')
