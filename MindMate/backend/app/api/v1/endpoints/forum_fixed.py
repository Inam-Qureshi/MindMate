# Forum endpoint - just use try-catch with db.rollback on error
# This is a minimal fix that wraps the existing logic

# Find the get_forum_questions function and modify its try-catch block
import sys

with open('/home/nomi/Desktop/MindMate (1)/MindMate/backend/app/api/v1/endpoints/forum.py', 'r') as f:
    lines = f.readlines()

# Find the async def get_forum_questions line
output = []
i = 0
while i < len(lines):
    output.append(lines[i])
    
    # After the docstring of get_forum_questions, add a db.rollback() at the start of try
    if 'async def get_forum_questions(' in lines[i]:
        # Find the try: statement
        while i < len(lines) and 'try:' not in lines[i]:
            i += 1
            output.append(lines[i])
        # Now we're at the try: line
        output.append(lines[i])  # Add the try:
        i += 1
        if i < len(lines):
            output.append('        db.rollback()  # Reset transaction state\n')
            output.append('        query = db.query(ForumQuestion)\n')
            # Skip the corrupted query lines until we find the filter
            while i < len(lines) and '.filter(ForumQuestion.is_deleted' not in lines[i]:
                i += 1
            continue
    
    i += 1

# Write the file
with open('/home/nomi/Desktop/MindMate (1)/MindMate/backend/app/api/v1/endpoints/forum.py', 'w') as f:
    f.writelines(output)

print("Fixed")
