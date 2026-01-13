# DevFocus 🔥

**A productivity tracking app built for developers who love to focus.**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.10+-blue)
![React](https://img.shields.io/badge/react-18+-61DAFB)

---

## 📖 About

DevFocus is a comprehensive productivity tracking application designed for developers. Track your focus sessions, manage tasks, collaborate in focus rooms, and gain insights into your productivity patterns.

### ✨ Key Features

- **🎯 Focus Sessions** - Precision timers for deep work tracking
- **📝 Task Management** - Organize tasks with custom types and tags
- **👥 Collaborative Rooms** - Join focus rooms with teammates
- **📊 Smart Insights** - AI-powered productivity recommendations
- **🔥 Streak Tracking** - Build consistent daily habits
- **📈 Analytics Dashboard** - Beautiful heatmaps and progress charts
- **🌐 Community** - Connect with other developers
- **👤 Public Profiles** - Share your productivity journey

---

## 🚀 Quick Start

### With Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/AgarwalChetan/DevFocus.git
cd DevFocus/app

# Configure environment
cp .env.example .env
cp frontend/.env.example frontend/.env

# Start all services
docker-compose up -d

# Access the app
# Frontend: http://localhost
# Backend: http://localhost:8001
```

### Manual Setup

**Prerequisites:**
- Python 3.10+
- Node.js 18+
- MongoDB 6.0+

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

**MongoDB:**
```bash
# Start local MongoDB
mongod --dbpath /path/to/data
```

---

## 📚 Documentation

- **[Production Deployment Guide](docs/Production.md)** - Complete deployment instructions
- **[API Documentation](docs/API.md)** - Backend API reference (coming soon)
- **[User Guide](docs/UserGuide.md)** - How to use DevFocus (coming soon)

---

## 🛠️ Technology Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **MongoDB** - NoSQL database with Motor (async driver)
- **JWT** - Secure authentication
- **WebSockets** - Real-time collaborative features
- **Pydantic** - Data validation

### Frontend
- **React 18** - UI framework
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - Beautiful component library
- **Vite** - Fast build tool
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

---

## 📁 Project Structure

```
DevFocus/
├── app/
│   ├── backend/
│   │   ├── server.py           # Main FastAPI application
│   │   ├── models.py           # Pydantic models
│   │   ├── auth.py             # Authentication logic
│   │   ├── database.py         # MongoDB connection
│   │   └── requirements.txt    # Python dependencies
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/     # Reusable components
│   │   │   ├── pages/          # Page components
│   │   │   ├── contexts/       # React contexts
│   │   │   └── hooks/          # Custom hooks
│   │   ├── public/             # Static assets
│   │   └── package.json        # Node dependencies
│   ├── docs/                   # Documentation
│   ├── docker-compose.yml      # Docker orchestration
│   ├── Dockerfile              # Backend container
│   └── .env.example            # Environment template
└── README.md
```

---

## 🔐 Security

DevFocus implements industry-standard security practices:

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - Bcrypt with salt
- **CORS Protection** - Configurable origins
- **Input Validation** - Pydantic models
- **HTTPS Support** - SSL/TLS in production
- **Rate Limiting** - API abuse prevention
- **Security Headers** - XSS, clickjacking protection

See [Production Deployment Guide](docs/Production.md#security-considerations) for more details.

---

## 🌐 Deployment

DevFocus supports multiple deployment options:

- **Docker** - Containerized deployment with Docker Compose
- **VPS** - DigitalOcean, Linode, AWS EC2
- **PaaS** - Heroku, Railway, Render
- **Serverless** - Vercel (frontend) + AWS Lambda (backend)
- **Kubernetes** - For scalable production deployments

Check the [Production Guide](docs/Production.md) for detailed instructions.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint/Prettier for JavaScript
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## 📝 License

This project is developed by **Chetan Agarwal** for DevFocus.

---

## 👨‍💻 Author

**Chetan Agarwal**

- 📧 Email: [agar.chetan1@gmail.com](mailto:agar.chetan1@gmail.com)
- 🐙 GitHub: [@AgarwalChetan](https://github.com/AgarwalChetan)

---

## 🙏 Acknowledgments

- Built with ❤️ for developers who love to focus
- Inspired by the need for better productivity tracking
- Thanks to the open-source community

---

## 📊 Statistics

- **Languages:** Python, JavaScript
- **Frameworks:** FastAPI, React
- **Database:** MongoDB
- **Deployment:** Docker, Nginx

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] Integrations (GitHub, JIRA, Slack)
- [ ] Advanced analytics
- [ ] Team workspaces
- [ ] Premium features
- [ ] Browser extension

---

## 🐛 Known Issues

See [Issues](https://github.com/AgarwalChetan/DevFocus/issues) for a list of known bugs and planned improvements.

---

## 💬 Support

Need help? Have questions?

- 📧 Email: agar.chetan1@gmail.com
- 🐙 GitHub Issues: [Create an issue](https://github.com/AgarwalChetan/DevFocus/issues/new)
- 📖 Documentation: [docs/Production.md](docs/Production.md)

---

## ⭐ Show Your Support

If you found DevFocus helpful, please consider giving it a star! ⭐

---

**Made with 🔥 by Chetan Agarwal**

