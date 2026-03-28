# -*- coding: utf-8 -*-
"""
Schema-based parameter validation.

Provides YAML schema loading and validation for request parameters,
following Skill input parameter specification pattern.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import logging

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

logger = logging.getLogger(__name__)

# 内置默认 Schema（当文件不存在时使用）
DEFAULT_SCHEMA: Dict[str, Any] = {
    "inputs": {
        "userInput": {
            "type": "string",
            "required": True,
            "max_length": 10000,
            "description": "用户输入的表单描述或需求"
        },
        "chatContext": {
            "type": "string",
            "required": False,
            "default": "",
            "max_length": 50000,
            "description": "对话上下文信息"
        },
        "formMetadata": {
            "type": "object",
            "required": False,
            "description": "表单元数据结构"
        },
        "generationOptions": {
            "type": "object",
            "required": False,
            "default": {"count": 1, "mode": "standard", "locale": "zh-CN", "validateRules": True},
            "description": "数据生成选项",
            "properties": {
                "count": {"type": "integer", "default": 1, "min": 1, "max": 10},
                "mode": {"type": "string", "default": "standard", "enum": ["quick", "standard", "detailed"]},
                "locale": {"type": "string", "default": "zh-CN", "enum": ["zh-CN", "en-US", "ja-JP"]},
                "validateRules": {"type": "boolean", "default": True}
            }
        },
        "aiOptions": {
            "type": "object",
            "required": False,
            "description": "AI 服务选项",
            "properties": {
                "model": {"type": "string", "default": "qwen-turbo-latest"},
                "temperature": {"type": "float", "default": 0.7, "min": 0.0, "max": 2.0},
                "roleType": {"type": "string", "default": "default_form", "enum": ["default_form", "coder", "md_generate", "worker_logger", "prompt_generation"]}
            }
        }
    }
}


@dataclass
class SchemaValidationResult:
    """Result of schema validation."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    sanitized_data: Optional[Dict[str, Any]] = None


class SchemaValidator:
    """YAML schema-based validator for request parameters."""

    def __init__(self, schema_path: Optional[str] = None):
        self.schema_path = schema_path
        self.schema = self._load_schema()

    def _load_schema(self) -> Dict[str, Any]:
        """Load YAML schema file or use default."""
        # 如果没有指定路径，使用内置默认 schema
        if self.schema_path is None:
            logger.info("Using built-in default schema")
            return DEFAULT_SCHEMA

        # 尝试多种路径查找
        possible_paths = [
            Path(self.schema_path),
            # 相对于当前模块文件的路径
            Path(__file__).parent.parent.parent.parent / "config" / "param_schema.yaml",
            # 相对于工作目录
            Path.cwd() / "config" / "param_schema.yaml",
        ]

        for path in possible_paths:
            if path.exists():
                logger.info(f"Loading schema from: {path}")
                if YAML_AVAILABLE:
                    try:
                        with path.open("r", encoding="utf-8") as f:
                            return yaml.safe_load(f)
                    except Exception as e:
                        logger.warning(f"Failed to load schema from {path}: {e}")
                        continue

        # 如果都找不到文件，使用默认 schema
        logger.info("Schema file not found, using built-in default schema")
        return DEFAULT_SCHEMA

    def validate_request(self, data: Dict[str, Any]) -> SchemaValidationResult:
        """Validate request data against schema."""
        errors: List[str] = []
        warnings: List[str] = []

        inputs_schema = self.schema.get("inputs", {})

        # Check required fields
        for field_name, field_schema in inputs_schema.items():
            if field_schema.get("required", False) and field_name not in data:
                errors.append(f"Required field '{field_name}' is missing")

        # Validate each provided field
        for field_name, value in data.items():
            if field_name not in inputs_schema:
                warnings.append(f"Unknown field '{field_name}' will be ignored")
                continue

            field_schema = inputs_schema[field_name]
            error = self._validate_field(field_name, value, field_schema)
            if error:
                errors.append(error)

        return SchemaValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    def _validate_field(
        self,
        field_name: str,
        value: Any,
        field_schema: Dict[str, Any]
    ) -> Optional[str]:
        """Validate a single field against its schema."""
        expected_type = field_schema.get("type")

        # Type validation
        if expected_type and not self._check_type(value, expected_type):
            return f"Field '{field_name}' has invalid type. Expected {expected_type}, got {type(value).__name__}"

        # String-specific validations
        if expected_type == "string" and isinstance(value, str):
            max_length = field_schema.get("max_length")
            if max_length and len(value) > max_length:
                return f"Field '{field_name}' exceeds max length of {max_length}"

            # Enum validation
            enum_values = field_schema.get("enum")
            if enum_values and value not in enum_values:
                return f"Field '{field_name}' value '{value}' not in allowed values: {enum_values}"

        # Integer-specific validations
        if expected_type == "integer" and isinstance(value, int):
            min_val = field_schema.get("min")
            max_val = field_schema.get("max")
            if min_val is not None and value < min_val:
                return f"Field '{field_name}' value {value} is below minimum {min_val}"
            if max_val is not None and value > max_val:
                return f"Field '{field_name}' value {value} exceeds maximum {max_val}"

        # Float-specific validations
        if expected_type == "float" and isinstance(value, (int, float)):
            min_val = field_schema.get("min")
            max_val = field_schema.get("max")
            if min_val is not None and value < min_val:
                return f"Field '{field_name}' value {value} is below minimum {min_val}"
            if max_val is not None and value > max_val:
                return f"Field '{field_name}' value {value} exceeds maximum {max_val}"

        # Object validation (nested properties)
        if expected_type == "object" and isinstance(value, dict):
            properties_schema = field_schema.get("properties", {})
            for prop_name, prop_value in value.items():
                if prop_name in properties_schema:
                    prop_error = self._validate_field(
                        f"{field_name}.{prop_name}",
                        prop_value,
                        properties_schema[prop_name]
                    )
                    if prop_error:
                        return prop_error

        return None

    def _check_type(self, value: Any, expected_type: str) -> bool:
        """Check if value matches expected type."""
        type_mapping = {
            "string": str,
            "integer": int,
            "float": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict
        }

        expected = type_mapping.get(expected_type)
        if expected is None:
            return True  # Unknown type, skip validation

        return isinstance(value, expected)

    def apply_defaults(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply default values for missing optional fields."""
        inputs_schema = self.schema.get("inputs", {})
        result = dict(data)  # Copy original data

        for field_name, field_schema in inputs_schema.items():
            if field_name not in result and "default" in field_schema:
                result[field_name] = field_schema["default"]

            # Apply defaults to nested object properties
            if field_schema.get("type") == "object" and field_name in result:
                properties_schema = field_schema.get("properties", {})
                for prop_name, prop_schema in properties_schema.items():
                    if prop_name not in result[field_name] and "default" in prop_schema:
                        result[field_name][prop_name] = prop_schema["default"]

        return result

    def get_enum_values(self, field_path: str) -> List[str]:
        """Get enum values for a field by path (e.g., 'aiOptions.roleType')."""
        inputs_schema = self.schema.get("inputs", {})

        # Parse path (e.g., "aiOptions.roleType")
        parts = field_path.split(".")

        if len(parts) == 1:
            # Top-level field
            field_schema = inputs_schema.get(parts[0], {})
            return field_schema.get("enum", [])

        elif len(parts) == 2:
            # Nested property
            parent_schema = inputs_schema.get(parts[0], {})
            properties_schema = parent_schema.get("properties", {})
            prop_schema = properties_schema.get(parts[1], {})
            return prop_schema.get("enum", [])

        return []

    def get_field_info(self, field_path: str) -> Dict[str, Any]:
        """Get full field schema info by path."""
        inputs_schema = self.schema.get("inputs", {})

        parts = field_path.split(".")

        if len(parts) == 1:
            return inputs_schema.get(parts[0], {})

        elif len(parts) == 2:
            parent_schema = inputs_schema.get(parts[0], {})
            properties_schema = parent_schema.get("properties", {})
            return properties_schema.get(parts[1], {})

        return {}


# Global validator instance
_schema_validator: Optional[SchemaValidator] = None


def get_schema_validator() -> SchemaValidator:
    """Get the global schema validator instance."""
    global _schema_validator
    if _schema_validator is None:
        _schema_validator = SchemaValidator()
    return _schema_validator


__all__ = [
    "SchemaValidator",
    "SchemaValidationResult",
    "get_schema_validator",
]