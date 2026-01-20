import json
from pathlib import Path
from typing import Dict, Any, List, Tuple
from grpc_tools import protoc
import sys

class JsonToProto:
    def __init__(self):
        self.type_mapping = {
            "string": "string",
            "integer": "int32",
            "number": "double",
            "boolean": "bool"
        }

    def to_snake_case(self, name: str) -> str:
        import re
        name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()

    def convert(self, schema: Dict[str, Any], root_name: str, package_name: str) -> str:
        lines = ['syntax = "proto3";', f'package {package_name};', '', f'message {root_name} {{']
        
        properties = schema.get("properties", {})
        nested_messages: List[str] = []
        fields: List[str] = []
        
        # Determine required fields to mark optional if needed (though strict Proto3 
        # doesn't strictly need 'optional' for presence unless explicit uniqueness is required,
        # standard fields are implicit presence. We'll stick to standard implicit presence for now
        # unless specifics demand 'optional').
        
        field_number = 1
        for prop_name, prop_def in properties.items():
            field_lines, extra_messages = self._process_field(prop_name, prop_def, field_number)
            fields.extend(field_lines)
            nested_messages.extend(extra_messages)
            field_number += 1
            
        # Add nested messages at the top of the message body
        if nested_messages:
            for msg in nested_messages:
                lines.extend("  " + line for line in msg.split('\n'))
            lines.append('')

        # Add fields
        lines.extend("  " + line for line in fields)
        lines.append("}")
        
        return "\n".join(lines) + "\n"

    def _process_field(self, name: str, definition: Dict[str, Any], number: int) -> Tuple[List[str], List[str]]:
        prop_type = definition.get("type")
        nested_msgs = []
        field_stmt = ""

        if prop_type == "object":
            # Create a nested message name. simple capitalization.
            sub_msg_name = "".join(word.capitalize() for word in name.split('_'))
            
            # Generate the nested message body recursively
            # We construct a fake schema wrapper for the nested object to reuse logic if we wanted,
            # but here we just need the body.
            sub_lines = [f"message {sub_msg_name} {{"]
            sub_props = definition.get("properties", {})
            sub_field_num = 1
            sub_fields = []
            
            for sub_p_name, sub_p_def in sub_props.items():
                f_lines, m_lines = self._process_field(sub_p_name, sub_p_def, sub_field_num)
                sub_fields.extend(f_lines)
                nested_msgs.extend(m_lines) # Bubble up any deeper nested messages if strategy changes, 
                                            # but typically we nest them inside this one or strictly bubble.
                                            # Actually, Protobuf allows defining nested messages inside messages.
                                            # Let's simple-nest them here.
                sub_field_num += 1
            
            # Re-nest the bubbled messages inside IS correct for proto.
            if nested_msgs:
               # However, my current simple recursion bubbles them all the way to current scope. 
               # Let's just put them validly inside.
               pass

            # Update: recursing `_process_field` bubbles `nested_msgs` which are fully formed `message X {}`.
            # We should put these INSIDE the current `sub_msg_name` definition for proper scoping.
            for m in nested_msgs:
                sub_lines.extend("  " + l for l in m.split('\n'))
            nested_msgs = [] # Clear because we consumed them

            sub_lines.extend("  " + l for l in sub_fields)
            sub_lines.append("}")
            
            # The definition of the message is strictly returned as a "nested message"
            nested_msgs.append("\n".join(sub_lines))
            field_stmt = f"{sub_msg_name} {name} = {number};"

        elif prop_type == "array":
            items = definition.get("items", {})
            item_type = items.get("type")
            
            if item_type == "object":
                # Array of Objects -> repeated Message
                sub_msg_name = "".join(word.capitalize() for word in name.split('_'))
                
                # Generate the nested message
                sub_lines = [f"message {sub_msg_name} {{"]
                sub_props = items.get("properties", {})
                
                sub_field_num = 1
                inner_nested = []
                inner_fields = []
                for sub_p_name, sub_p_def in sub_props.items():
                    f_lines, m_lines = self._process_field(sub_p_name, sub_p_def, sub_field_num)
                    inner_fields.extend(f_lines)
                    inner_nested.extend(m_lines)
                    sub_field_num += 1
                
                for m in inner_nested:
                    sub_lines.extend("  " + l for l in m.split('\n'))
                    
                sub_lines.extend("  " + l for l in inner_fields)
                sub_lines.append("}")
                
                nested_msgs.append("\n".join(sub_lines))
                field_stmt = f"repeated {sub_msg_name} {name} = {number};"
                
            elif item_type in self.type_mapping:
                # simple repeated
                proto_type = self.type_mapping[item_type]
                field_stmt = f"repeated {proto_type} {name} = {number};"
            else:
                 # Fallback or mixed types not easily handled
                 field_stmt = f"// repeated {item_type} {name} = {number}; // TODO: fix type"

        elif prop_type in self.type_mapping:
            proto_type = self.type_mapping[prop_type]
            field_stmt = f"{proto_type} {name} = {number};"
            
        else:
            field_stmt = f"// unknown type {prop_type} {name} = {number};"

        stmts = []
        description = definition.get("description")
        if description:
            # Clean up newlines for single line comment or handle block if needed.
            # For now, simple single line expectation or just replacing newlines.
            clean_desc = description.replace('\n', ' ')
            stmts.append(f"// {clean_desc}")

        stmts.append(field_stmt)

        return stmts, nested_msgs


def generate_proto():
    input_path = Path("../../core/schemas").resolve()
    output_path = Path("models/generated/proto")
    output_path.mkdir(parents=True, exist_ok=True)
    
    json_files = list(input_path.glob("*.json"))
    converter = JsonToProto()
    
    print(f"Generating protos in {output_path}...")
    
    for json_file in json_files:
        try:
            with open(json_file, "r") as f:
                schema = json.load(f)
            
            # Determine package name from filename (snake_case)
            package_name = converter.to_snake_case(json_file.stem)
            
            # Force root name to "Message"
            root_name = "Message"
            
            proto_content = converter.convert(schema, root_name, package_name)
            output_file = output_path / f"{json_file.stem}.proto"
            
            with open(output_file, "w") as f:
                f.write(proto_content)
                
            print(f"  [+] Generated {output_file.name}")
            
        except Exception as e:
            print(f"  [X] Failed to process {json_file.name}: {e}")

    # Compile with betterproto
    proto_files = list(output_path.glob("*.proto"))
    
    if not proto_files:
        print("No proto files found to compile.")
        return

    # Add init file to make it a package if missing
    (output_path / "__init__.py").touch(exist_ok=True)
    
    cmd = [
        "grpc_tools.protoc",
        f"-I{output_path}",
        f"--python_betterproto_out={output_path}",
    ] + [str(p) for p in proto_files]
    
    print(f"Compiling {len(proto_files)} proto files with betterproto...")
    
    # Save original argv
    original_argv = sys.argv
    try:
        sys.argv = cmd
        # protoc.main() uses sys.argv
        exit_code = protoc.main(cmd)
    finally:
        sys.argv = original_argv
    
    if exit_code != 0:
        print(f"Protoc failed with code {exit_code}")
        sys.exit(exit_code)
    else:
        print("Betterproto compilation successful.")

if __name__ == "__main__":
    generate_proto()