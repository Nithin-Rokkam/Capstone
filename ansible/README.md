# Ansible Deployment for News Recommender API

This directory contains all the necessary Ansible configuration files to deploy the News Recommender API to AWS EC2.

## Directory Structure

```
ansible/
├── README.md                          # This file
├── requirements.txt                   # Python dependencies for Ansible
├── inventory.ini                      # EC2 hosts configuration
├── ansible.cfg                        # Ansible configuration
├── deploy.yml                         # Main Ansible playbook
├── deploy.sh                          # Bash deployment script (Linux/Mac)
├── deploy.ps1                         # PowerShell deployment script (Windows)
├── templates/                         # Jinja2 templates
│   ├── env.j2                         # Environment variables
│   ├── supervisor_fastapi.conf.j2     # Supervisor configuration
│   └── nginx.conf.j2                  # Nginx configuration
└── newsrec.pem                        # SSH key (add this file)
```

## Quick Start

### 1. Prerequisites

**Local Machine:**
- Python 3.7+
- Ansible 2.10+
- SSH client (built-in on Linux/Mac, Git Bash on Windows)

**AWS EC2 Instance:**
- Amazon Linux 2 or Ubuntu 20.04+
- At least 2GB RAM, 50GB storage
- Security group allowing SSH (port 22), HTTP (port 80), HTTPS (port 443)

### 2. Setup

```bash
# Install Ansible
pip install -r requirements.txt

# Copy your PEM key
cp /path/to/newsrec.pem .
chmod 600 newsrec.pem

# Update inventory.ini with your EC2 IP
# Edit: ansible_host=YOUR_EC2_IP
```

### 3. Deploy

**Option A: Automated Script (Recommended)**

Linux/Mac:
```bash
chmod +x deploy.sh
./deploy.sh
```

Windows (PowerShell):
```powershell
.\deploy.ps1
```

**Option B: Manual Ansible Command**

```bash
ansible-playbook deploy.yml -i inventory.ini \
  -e "newsapi_api_key=YOUR_API_KEY"
```

### 4. Verify

```bash
# Check API health
curl http://YOUR_EC2_IP/api/health

# Access API documentation
open http://YOUR_EC2_IP/docs
```

## Configuration Files

### inventory.ini
Defines EC2 hosts and connection parameters.

```ini
[aws_ec2]
news-recommender-server ansible_host=YOUR_EC2_IP ansible_user=ec2-user
```

**Variables:**
- `ansible_host`: EC2 instance public IP
- `ansible_user`: SSH user (ec2-user for Amazon Linux, ubuntu for Ubuntu)
- `ansible_ssh_private_key_file`: Path to PEM key

### ansible.cfg
Global Ansible configuration.

**Key settings:**
- `inventory`: Path to inventory file
- `host_key_checking`: Disable SSH key verification
- `private_key_file`: Default SSH key path
- `log_path`: Ansible execution log

### deploy.yml
Main playbook with all deployment tasks.

**Tasks:**
1. System updates and package installation
2. Application user creation
3. Repository cloning
4. Python virtual environment setup
5. Dependency installation
6. Configuration file generation
7. Service setup (Supervisor, Nginx)
8. Health checks

### Templates

#### env.j2
Environment variables for the application.

```
NEWS_API_KEY={{ newsapi_key }}
APP_ENV=production
DEBUG=False
```

#### supervisor_fastapi.conf.j2
Supervisor configuration for process management.

```
[program:news-recommender-api]
command={{ venv_dir }}/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000
```

#### nginx.conf.j2
Nginx reverse proxy configuration.

```
upstream news_recommender_api {
    server 127.0.0.1:8000;
}
```

## Deployment Scripts

### deploy.sh (Linux/Mac)

Interactive bash script with:
- Prerequisite checking
- SSH connectivity testing
- Ansible connectivity verification
- Variable collection
- Playbook execution
- Deployment verification

Usage:
```bash
./deploy.sh
```

### deploy.ps1 (Windows)

PowerShell script with similar functionality.

Usage:
```powershell
.\deploy.ps1
```

Or with parameters:
```powershell
.\deploy.ps1 -EC2IP "1.2.3.4" -NewsAPIKey "your-key"
```

## Manual Deployment

If you prefer to run Ansible directly:

```bash
# Basic deployment
ansible-playbook deploy.yml -i inventory.ini

# With variables
ansible-playbook deploy.yml -i inventory.ini \
  -e "newsapi_api_key=YOUR_API_KEY" \
  -e "github_repo=https://github.com/YOUR_USERNAME/repo.git"

# Verbose output
ansible-playbook deploy.yml -i inventory.ini -vvv

# Dry run (check mode)
ansible-playbook deploy.yml -i inventory.ini --check
```

## Troubleshooting

### SSH Connection Issues

```bash
# Test SSH manually
ssh -i newsrec.pem ec2-user@YOUR_EC2_IP

# Verbose SSH
ssh -vvv -i newsrec.pem ec2-user@YOUR_EC2_IP

# Common fixes:
# 1. Fix PEM permissions: chmod 600 newsrec.pem
# 2. Check security group allows port 22
# 3. Verify correct EC2 IP address
# 4. Verify correct SSH user (ec2-user vs ubuntu)
```

### Ansible Connectivity Issues

```bash
# Test Ansible connectivity
ansible all -i inventory.ini -m ping

# Verbose ping
ansible all -i inventory.ini -m ping -vvv

# Check inventory syntax
ansible-inventory -i inventory.ini --list
```

### Application Issues

```bash
# SSH into instance
ssh -i newsrec.pem ec2-user@YOUR_EC2_IP

# Check application status
sudo supervisorctl status

# View application logs
sudo tail -f /var/log/news-recommender-api.log

# Restart application
sudo supervisorctl restart news-recommender-api

# Check Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/news-recommender-error.log
```

## Post-Deployment

### 1. Verify API

```bash
# Health check
curl http://YOUR_EC2_IP/api/health

# Get trending news
curl http://YOUR_EC2_IP/api/trending

# Search articles
curl -X POST http://YOUR_EC2_IP/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "artificial intelligence"}'
```

### 2. Setup SSL/TLS

```bash
ssh -i newsrec.pem ec2-user@YOUR_EC2_IP

# Install Certbot
sudo yum install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### 3. Monitor Application

```bash
# Real-time logs
ssh -i newsrec.pem ec2-user@YOUR_EC2_IP
sudo tail -f /var/log/news-recommender-api.log

# Application status
sudo supervisorctl status

# System resources
top
```

## Updating Deployment

### Pull Latest Code

```bash
ssh -i newsrec.pem ec2-user@YOUR_EC2_IP
cd /home/newsrec/news-recommender-api
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart news-recommender-api
```

### Re-run Playbook

```bash
ansible-playbook deploy.yml -i inventory.ini -e "force_update=true"
```

## Rollback

If deployment fails:

```bash
ssh -i newsrec.pem ec2-user@YOUR_EC2_IP
cd /home/newsrec/news-recommender-api

# Revert to previous commit
git checkout HEAD~1

# Reinstall dependencies
source venv/bin/activate
pip install -r requirements.txt

# Restart application
sudo supervisorctl restart news-recommender-api
```

## Performance Tuning

### Increase Workers

Edit `/etc/supervisor/conf.d/news-recommender-api.conf`:

```
command=/home/newsrec/news-recommender-api/venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 8
```

Then restart:
```bash
sudo supervisorctl restart news-recommender-api
```

### Nginx Optimization

Edit `/etc/nginx/nginx.conf`:

```
worker_processes auto;
worker_connections 1024;
```

## Security Best Practices

1. **SSH Key Management**
   - Keep PEM file secure
   - Never commit to Git
   - Restrict file permissions: `chmod 600`

2. **Firewall Rules**
   - Restrict SSH to your IP only
   - Allow HTTP/HTTPS from anywhere
   - Use security groups

3. **Environment Variables**
   - Store secrets in `.env` file
   - Never hardcode API keys
   - Use IAM roles for AWS access

4. **Regular Updates**
   - Keep system packages updated
   - Update Python dependencies
   - Monitor security advisories

## Useful Commands

```bash
# SSH into instance
ssh -i newsrec.pem ec2-user@YOUR_EC2_IP

# View logs
sudo tail -f /var/log/news-recommender-api.log

# Restart application
sudo supervisorctl restart news-recommender-api

# Check Nginx
sudo systemctl status nginx

# Check disk usage
df -h

# Check memory usage
free -h

# View running processes
ps aux | grep uvicorn
```

## Additional Resources

- [Ansible Documentation](https://docs.ansible.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Supervisor Documentation](http://supervisord.org/)

## Support

For issues:
1. Check logs: `/var/log/news-recommender-api.log`
2. Verify EC2 security groups
3. Test API endpoints manually
4. Review Ansible output for errors

---

**Happy Deploying!** 🚀
