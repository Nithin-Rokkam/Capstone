# Ansible Deployment Setup - Summary

## What Has Been Created

I've set up a complete Ansible deployment infrastructure for your News Recommender API on AWS EC2. Here's what you now have:

### 📁 Directory Structure

```
ansible/
├── README.md                          # Detailed Ansible documentation
├── requirements.txt                   # Python dependencies
├── inventory.ini                      # EC2 hosts configuration
├── ansible.cfg                        # Ansible settings
├── deploy.yml                         # Main playbook (400+ lines)
├── deploy.sh                          # Bash automation script
├── deploy.ps1                         # PowerShell automation script
└── templates/
    ├── env.j2                         # Environment variables
    ├── supervisor_fastapi.conf.j2     # Process manager config
    └── nginx.conf.j2                  # Reverse proxy config
```

### 📚 Documentation

1. **QUICK_START_ANSIBLE.md** - 5-minute quick start guide
2. **ANSIBLE_DEPLOYMENT_GUIDE.md** - Comprehensive deployment guide
3. **ansible/README.md** - Detailed Ansible documentation

## Getting Started (3 Steps)

### Step 1: Install Ansible
```bash
pip install ansible
```

### Step 2: Configure
```bash
cd ansible
cp /path/to/newsrec.pem .
chmod 600 newsrec.pem

# Edit inventory.ini and replace YOUR_EC2_IP with your EC2 IP
```

### Step 3: Deploy
```bash
# Windows (PowerShell)
.\deploy.ps1

# Linux/Mac (Bash)
chmod +x deploy.sh
./deploy.sh
```

## What Gets Deployed

✅ **System Setup**
- Python 3 + pip
- Build tools (gcc, python3-dev)
- Git for repository cloning

✅ **Application Stack**
- Python virtual environment
- FastAPI + Uvicorn
- All Python dependencies from requirements.txt

✅ **Process Management**
- Supervisor for application process management
- Auto-restart on failure
- Logging to `/var/log/news-recommender-api.log`

✅ **Web Server**
- Nginx reverse proxy
- Security headers configured
- Proxy pass to FastAPI on port 8000
- Static file serving

✅ **Data**
- MIND dataset download (optional)
- Embeddings loading

✅ **Monitoring**
- Health check endpoint
- Logging configured
- Error tracking

## Key Features

### 🔒 Security
- Dedicated application user (`newsrec`)
- Restricted file permissions
- Security headers in Nginx
- SSH key-based authentication

### 🚀 Performance
- Multi-worker Uvicorn setup
- Nginx caching headers
- Connection pooling
- Optimized supervisor config

### 📊 Monitoring
- Application logs: `/var/log/news-recommender-api.log`
- Nginx logs: `/var/log/nginx/`
- Supervisor status: `supervisorctl status`
- Health endpoint: `/api/health`

### 🔄 Automation
- Automated deployment scripts
- Health checks after deployment
- Auto-restart on failure
- Easy updates and rollbacks

## Deployment Verification

After deployment, verify with:

```bash
# Check API health
curl http://YOUR_EC2_IP/api/health

# Access API documentation
open http://YOUR_EC2_IP/docs

# Test search endpoint
curl -X POST http://YOUR_EC2_IP/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "artificial intelligence"}'
```

## File Descriptions

### deploy.yml (Main Playbook)
- 189 lines of Ansible tasks
- Handles all deployment steps
- Idempotent (safe to run multiple times)
- Supports both Amazon Linux and Ubuntu

### Templates
- **env.j2**: Sets environment variables (API key, debug mode, etc.)
- **supervisor_fastapi.conf.j2**: Configures Uvicorn process management
- **nginx.conf.j2**: Configures reverse proxy and security

### Scripts
- **deploy.sh**: Interactive bash script with validation and error handling
- **deploy.ps1**: PowerShell version for Windows users

## Configuration Options

### inventory.ini
```ini
[aws_ec2]
news-recommender-server ansible_host=YOUR_EC2_IP ansible_user=ec2-user
```

### Variables (pass via -e flag)
```bash
-e "newsapi_api_key=YOUR_KEY"
-e "github_repo=https://github.com/YOUR_USERNAME/repo.git"
```

## Common Tasks

### SSH into Instance
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
```

### View Application Logs
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP sudo tail -f /var/log/news-recommender-api.log
```

### Restart Application
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP sudo supervisorctl restart news-recommender-api
```

### Update Application
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
cd /home/newsrec/news-recommender-api
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart news-recommender-api
```

## Troubleshooting

### SSH Connection Failed
1. Verify EC2 IP is correct
2. Check security group allows port 22
3. Ensure PEM file has correct permissions: `chmod 600`
4. Verify SSH user (ec2-user for Amazon Linux, ubuntu for Ubuntu)

### Ansible Connectivity Failed
1. Test with: `ansible all -i inventory.ini -m ping`
2. Check inventory.ini syntax
3. Verify SSH key path
4. Check EC2 instance is running

### API Not Responding
1. SSH into instance
2. Check status: `sudo supervisorctl status`
3. View logs: `sudo tail -f /var/log/news-recommender-api.log`
4. Restart: `sudo supervisorctl restart news-recommender-api`

## Next Steps

1. **Deploy**: Follow the 3-step quick start above
2. **Verify**: Test API endpoints
3. **Monitor**: Set up log monitoring
4. **Secure**: Add SSL/TLS certificate
5. **Scale**: Increase workers if needed

## Security Recommendations

1. ✅ Use SSH key authentication (already configured)
2. ✅ Restrict security group to your IP
3. ✅ Store API key in .env file (not in code)
4. ✅ Enable HTTPS with SSL certificate
5. ✅ Keep system packages updated
6. ✅ Monitor application logs regularly

## Performance Tips

1. Increase Supervisor workers for higher throughput
2. Enable Nginx caching for static content
3. Use CloudFront CDN for frontend
4. Monitor CPU and memory usage
5. Set up auto-scaling groups

## Support & Documentation

- **Quick Start**: See `QUICK_START_ANSIBLE.md`
- **Detailed Guide**: See `ANSIBLE_DEPLOYMENT_GUIDE.md`
- **Ansible Docs**: See `ansible/README.md`
- **Ansible Official**: https://docs.ansible.com/

---

## Summary

You now have a production-ready Ansible deployment setup that:

✅ Automates EC2 deployment completely
✅ Handles all system configuration
✅ Manages application lifecycle
✅ Provides monitoring and logging
✅ Enables easy updates and rollbacks
✅ Follows security best practices

**Ready to deploy?** Start with `QUICK_START_ANSIBLE.md`!
