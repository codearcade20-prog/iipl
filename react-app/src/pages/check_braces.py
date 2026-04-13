
import sys

def check_braces(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    stack = []
    for line_num, line in enumerate(lines, 1):
        for char in line:
            if char == '{':
                stack.append(line_num)
            elif char == '}':
                if not stack:
                    print(f"Excess closing brace at line {line_num}")
                    return
                stack.pop()
                if not stack:
                   print(f"Top-level function closed at line {line_num}")
            
    if stack:
        print(f"Unclosed open braces starting at lines: {stack}")
    else:
        print("All braces matched")

if __name__ == "__main__":
    check_braces(sys.argv[1])
