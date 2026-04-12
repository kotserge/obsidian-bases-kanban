# Bug 1: Property Rendering

Currently, when multiple properties are enabled and rendered on a card, disabling a property removes the wrong property and keeps the disabled property. Additionally, when reenableing this property, it doubles the rendering of the property.

## Goal

After the fix, when disabling a property, the correct one is removed. 

## Notes

When reenableing, the doubling of properties is possibly a side-effect of the original bug.
