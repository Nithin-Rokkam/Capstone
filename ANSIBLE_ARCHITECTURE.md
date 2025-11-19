# Ansible Deployment Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Local Machine                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Ansible Control Node                                    │  │
│  │  ├─ ansible/deploy.yml (Playbook)                        │  │
│  │  ├─ ansible/inventory.ini (Hosts)                        │  │
│  │  ├─ ansible/deploy.sh / deploy.ps1 (Scripts)            │  │
│  │  └─ newsrec.pem (SSH Key)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            │ SSH (Port 22)                      │
│                            │ + Ansible Modules                  │
│                            ▼                                    │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS EC2 Instance                           │
│                   (Amazon Linux 2 / Ubuntu)                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  System Layer                                            │  │
│  │  ├─ Python 3 + pip                                       │  │
│  │  ├─ Git                                                  │  │
│  │  ├─ Build tools (gcc, python3-dev)                       │  │
│  │  └─ System packages                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Application Layer                                       │  │
│  │  ├─ /home/newsrec/news-recommender-api/                 │  │
│  │  │  ├─ venv/ (Python Virtual Environment)               │  │
│  │  │  ├─ src/ (Application Code)                          │  │
│  │  │  ├─ data/ (MIND Dataset)                             │  │
│  │  │  └─ requirements.txt                                 │  │
│  │  └─ .env (Environment Variables)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Process Management Layer                                │  │
│  │  ├─ Supervisor                                           │  │
│  │  │  └─ news-recommender-api (Uvicorn Process)           │  │
│  │  │     ├─ Port: 8000 (Internal)                         │  │
│  │  │     ├─ Workers: 4                                    │  │
│  │  │     └─ Auto-restart: Enabled                         │  │
│  │  └─ Logs: /var/log/news-recommender-api.log             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Web Server Layer                                        │  │
│  │  ├─ Nginx (Reverse Proxy)                               │  │
│  │  │  ├─ Port: 80 (HTTP)                                  │  │
│  │  │  ├─ Proxy Pass: http://127.0.0.1:8000               │  │
│  │  │  ├─ Security Headers                                 │  │
│  │  │  └─ Logs: /var/log/nginx/                            │  │
│  │  └─ Static Files: /frontend/dist/                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP (Port 80)
                             │ HTTPS (Port 443)
                             ▼
                    ┌────────────────┐
                    │   End Users    │
                    │  / Frontend    │
                    └────────────────┘
```

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Deployment Process Flow                      │
└─────────────────────────────────────────────────────────────────┘

1. PREPARATION
   ├─ Install Ansible
   ├─ Copy PEM key
   ├─ Update inventory.ini
   └─ Test SSH connection

2. EXECUTION
   ├─ Run deploy.sh / deploy.ps1
   │  └─ Calls: ansible-playbook deploy.yml
   │
   └─ Ansible Playbook Execution:
      ├─ System Updates
      │  ├─ Update packages
      │  └─ Install dependencies
      │
      ├─ Application Setup
      │  ├─ Create app user
      │  ├─ Clone repository
      │  ├─ Create venv
      │  └─ Install Python packages
      │
      ├─ Data Preparation
      │  ├─ Create data directory
      │  └─ Download MIND dataset (optional)
      │
      ├─ Configuration
      │  ├─ Create .env file
      │  ├─ Setup Supervisor config
      │  └─ Setup Nginx config
      │
      └─ Service Startup
         ├─ Start Supervisor
         ├─ Start Nginx
         └─ Health check

3. VERIFICATION
   ├─ Check API health
   ├─ Test endpoints
   └─ Verify logs
```

## File Structure & Responsibilities

```
Project Root/
│
├─ ansible/                          # Deployment automation
│  ├─ deploy.yml                     # Main playbook (189 lines)
│  ├─ inventory.ini                  # EC2 hosts config
│  ├─ ansible.cfg                    # Ansible settings
│  ├─ deploy.sh                      # Bash automation
│  ├─ deploy.ps1                     # PowerShell automation
│  ├─ requirements.txt                # Ansible dependencies
│  ├─ README.md                      # Ansible documentation
│  │
│  └─ templates/                     # Jinja2 templates
│     ├─ env.j2                      # Environment variables
│     ├─ supervisor_fastapi.conf.j2  # Process manager config
│     └─ nginx.conf.j2               # Reverse proxy config
│
├─ src/                              # Application source
│  ├─ main.py                        # FastAPI app
│  ├─ newsapi_client.py              # NewsAPI integration
│  ├─ recommender.py                 # Recommendation engine
│  └─ data_preprocessing.py          # Data processing
│
├─ frontend/                         # React frontend
│  └─ src/
│     ├─ App.jsx
│     ├─ pages/
│     └─ ...
│
├─ data/                             # MIND dataset
│  ├─ MINDlarge_train/
│  ├─ MINDlarge_dev/
│  ├─ MINDlarge_test/
│  ├─ processed_news.csv
│  └─ news_embeddings.npz
│
├─ requirements.txt                  # Python dependencies
├─ main.py                           # Entry point
├─ DEPLOYMENT_SUMMARY.md             # Deployment overview
├─ QUICK_START_ANSIBLE.md            # Quick start guide
├─ ANSIBLE_DEPLOYMENT_GUIDE.md       # Detailed guide
└─ DEPLOYMENT_CHECKLIST.md           # Deployment checklist
```

## Configuration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Configuration Management                      │
└─────────────────────────────────────────────────────────────────┘

Ansible Variables (from -e flags)
    │
    ├─ newsapi_api_key
    ├─ github_repo
    └─ app_user, app_home, etc.
    │
    ▼
Jinja2 Templates (ansible/templates/)
    │
    ├─ env.j2
    │  └─ Generates: /home/newsrec/news-recommender-api/.env
    │
    ├─ supervisor_fastapi.conf.j2
    │  └─ Generates: /etc/supervisor/conf.d/news-recommender-api.conf
    │
    └─ nginx.conf.j2
       └─ Generates: /etc/nginx/sites-available/news-recommender-api
    │
    ▼
EC2 Instance Configuration
    │
    ├─ Environment Variables (.env)
    ├─ Process Management (Supervisor)
    └─ Web Server (Nginx)
```

## Network Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Internet / Users                          │
└──────────────────────────────────────────────────────────────┘
                            │
                    HTTP/HTTPS (Port 80/443)
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              AWS Security Group (Firewall)                   │
│  ├─ Inbound: Port 22 (SSH) - Restricted                     │
│  ├─ Inbound: Port 80 (HTTP) - Open                          │
│  ├─ Inbound: Port 443 (HTTPS) - Open                        │
│  └─ Outbound: All (for external API calls)                  │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  Nginx (Port 80)                             │
│  ├─ Reverse Proxy                                           │
│  ├─ Security Headers                                        │
│  ├─ Static File Serving                                     │
│  └─ Proxy Pass → 127.0.0.1:8000                            │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              FastAPI + Uvicorn (Port 8000)                   │
│  ├─ 4 Worker Processes                                      │
│  ├─ Managed by Supervisor                                   │
│  └─ Handles API Requests                                    │
└──────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
        ┌──────────────┐ ┌──────────┐ ┌──────────┐
        │ MIND Dataset │ │ NewsAPI  │ │ Database │
        │ (Local)      │ │ (Remote) │ │ (Future) │
        └──────────────┘ └──────────┘ └──────────┘
```

## Deployment Timeline

```
Time    Component               Status
────────────────────────────────────────────────────────────
0:00    Start Deployment       ▶ Running
0:05    System Updates         ✓ Complete
0:10    Package Installation   ✓ Complete
0:15    App User Creation      ✓ Complete
0:20    Repository Clone       ✓ Complete
0:25    Virtual Environment    ✓ Complete
0:30    Python Dependencies    ✓ Complete (2-3 min)
0:35    Data Directory Setup   ✓ Complete
0:40    MIND Dataset Download  ⏳ Optional (5-10 min)
0:50    Configuration Files    ✓ Complete
0:55    Supervisor Setup       ✓ Complete
1:00    Nginx Setup            ✓ Complete
1:05    Service Startup        ✓ Complete
1:10    Health Check           ✓ Complete
1:15    Deployment Complete    ✓ Success
```

## Service Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                  Service Dependencies                       │
└─────────────────────────────────────────────────────────────┘

Nginx (Port 80)
    │
    └─ Depends on: FastAPI running
       │
       └─ FastAPI (Port 8000)
           │
           ├─ Depends on: Python Virtual Environment
           │  │
           │  └─ Depends on: Python 3 + pip
           │
           ├─ Depends on: Application Code
           │  │
           │  └─ Depends on: Git + Repository Clone
           │
           ├─ Depends on: Python Packages
           │  │
           │  └─ Depends on: requirements.txt
           │
           ├─ Depends on: MIND Dataset
           │  │
           │  └─ Depends on: Data Directory
           │
           └─ Depends on: Supervisor
              │
              └─ Depends on: Supervisor Package
```

## Monitoring & Logging

```
┌─────────────────────────────────────────────────────────────┐
│              Monitoring & Logging Architecture              │
└─────────────────────────────────────────────────────────────┘

Application Logs
    │
    ├─ /var/log/news-recommender-api.log
    │  └─ Application output, errors, debug info
    │
    ├─ /var/log/nginx/news-recommender-access.log
    │  └─ HTTP request logs
    │
    └─ /var/log/nginx/news-recommender-error.log
       └─ Nginx errors

Monitoring Points
    │
    ├─ Health Endpoint: /api/health
    │  └─ Returns: {"status": "healthy", ...}
    │
    ├─ Supervisor Status: supervisorctl status
    │  └─ Shows: Process status, uptime, restarts
    │
    ├─ System Resources
    │  ├─ CPU: top, ps aux
    │  ├─ Memory: free -h
    │  └─ Disk: df -h
    │
    └─ API Performance
       ├─ Response time
       ├─ Error rate
       └─ Request count
```

## Rollback Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Rollback Procedure                        │
└─────────────────────────────────────────────────────────────┘

Current Version (v1.0)
    │
    ├─ Git Commit: abc123def456
    ├─ Deployed: 2024-01-15
    └─ Status: Running
    │
    ▼
Issue Detected
    │
    ├─ Check Logs
    ├─ Identify Problem
    └─ Decide to Rollback
    │
    ▼
Rollback Steps
    │
    ├─ SSH into Instance
    ├─ Navigate to App Directory
    ├─ Git Checkout Previous Commit
    ├─ Reinstall Dependencies
    ├─ Restart Application
    └─ Verify Health
    │
    ▼
Previous Version (v0.9)
    │
    ├─ Git Commit: xyz789uvw012
    ├─ Deployed: 2024-01-10
    └─ Status: Running Again
```

---

## Key Points

✅ **Idempotent**: Can run playbook multiple times safely
✅ **Automated**: Minimal manual intervention required
✅ **Monitored**: Health checks and logging configured
✅ **Scalable**: Easy to add more instances
✅ **Recoverable**: Easy rollback if needed
✅ **Secure**: SSH key-based auth, security headers

---

For more details, see:
- `QUICK_START_ANSIBLE.md` - Quick start
- `ANSIBLE_DEPLOYMENT_GUIDE.md` - Detailed guide
- `ansible/README.md` - Ansible documentation
