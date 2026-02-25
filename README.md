
<div align="center">

# NOTE
This is a Fork, containing several changes not wanted in the original Project, check out the original Project. 

[Original Sharkord Repo](https://github.com/Sharkord/sharkord)

For a list of additional Features in comparison to the Main Sharkord, see the bottom of the README

  <h1>Sharkord</h1>
  <p><strong>A lightweight, self-hosted real-time communication platform</strong></p>

## What is Sharkord?

> [!NOTE]
> Sharkord is in alpha stage. Bugs, incomplete features and breaking changes are to be expected.

Sharkord is a self-hosted communication platform that brings the most important Discord-like features to your own infrastructure. Host voice channels, text chat, and file sharing on your terms—no third-party dependencies, complete data ownership, and full control over your group's communication.

## Docs

For detailed documentation, please visit the original Repos [Documentation](https://sharkord.com/docs). The changes done in this Fork are undocumented. 

## Wanna Try It Out?

Take a look at the original Sharkord Repos [Wanna Try It Out?](https://github.com/Sharkord/sharkord?tab=readme-ov-file#wanna-try-it-out) section

## Getting Started

There will probably never be proper Releases for this Fork, so your best bet is to clone the Project, install the dependencies and build it yourself

#### Linux x64

```bash
git clone https://github.com/GoldcrafterXD/sharkord
cd sharkord
bun install
cd apps/server
bun run build
```

Should result in several executables in 
```bash
apps/server/build/out
``` 
including \
linux-x64 \
linux-arm64 \
windows-x64 \
darwin-arm64

> [!NOTE]
> Upon first launch, Sharkord will create a secure token and print it to the console. This token allows ANYONE to gain owner access to your server, so make sure to store it securely and do not lose it!

Once the server is running, open your web browser and navigate to [http://localhost:4991](http://localhost:4991) to access the Sharkord client interface. If you're running the server on a different machine, replace `localhost` with the server's IP address or domain name.

Check out our [Documentation](https://sharkord.com/docs) for more detailed setup instructions, configuration options, and troubleshooting tips.

## License

The original Project is licensed under the MIT License - see the bottom part of the [LICENSE](LICENSE) file

The changes made to the project are licensed under the GPLv3 License - see the beginning of the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with amazing open-source technologies:

- [Bun](https://bun.sh)
- [tRPC](https://trpc.io)
- [Mediasoup](https://mediasoup.org)
- [Drizzle ORM](https://orm.drizzle.team)
- [React](https://react.dev)
- [Radix UI](https://www.radix-ui.com)
- [ShadCN UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com)


## Additional Features

</div>

- Private Messaging
- Grouped and Colored Roles in User Sidebar and Chats
- Improved custom Noise Cancelling
- Additional User Management Features 
  - Username Management
  - User Icon/Banner Management ( Planned, not implemented )

> [!NOTE]
> This Software is experimental and can break at any point in time