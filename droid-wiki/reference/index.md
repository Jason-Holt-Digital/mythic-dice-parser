# Reference

Use these pages for the current configuration and public data contract. They describe the checked-in source, not generated API documentation or older README JSON examples.

- [Configuration](configuration.md): SDK, analyzer, RNG, limits, global state, and automation controls.
- [Data models](data-models.md): exported types, fields, enums, equality, and serialization.
- [Dependencies](dependencies.md): direct package constraints and tooling roles.
- [Systems](../systems/index.md): implementation flows behind the public contract.
- [Maintainers](../maintainers.md): historical subsystem contacts, not formal ownership.

`pubspec.yaml` defines the package identity; `lib/mythic_dice_parser.dart` defines exports. Implementation-only AST classes and the statistics accumulator are not exported through that barrel.
