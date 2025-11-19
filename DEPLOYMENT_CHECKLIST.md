# Ansible Deployment Checklist

Use this checklist to ensure a smooth deployment to AWS EC2.

## Pre-Deployment

### AWS EC2 Setup
- [ ] Created EC2 instance (Amazon Linux 2 or Ubuntu 20.04+)
- [ ] Instance type: t3.medium or larger
- [ ] Storage: At least 50GB
- [ ] Downloaded PEM key file
- [ ] Noted EC2 public IP address
- [ ] Security group allows:
  - [ ] Port 22 (SSH)
  - [ ] Port 80 (HTTP)
  - [ ] Port 443 (HTTPS - for future)

### Local Machine Setup
- [ ] Python 3.7+ installed
- [ ] Ansible installed: `pip install ansible`
- [ ] SSH client available (built-in on Linux/Mac, Git Bash on Windows)
- [ ] Git installed (for cloning repo)

### Repository Preparation
- [ ] Cloned News Recommender API repository
- [ ] Navigated to project root directory
- [ ] Verified `ansible/` directory exists
- [ ] Verified all Ansible files are present:
  - [ ] `ansible/deploy.yml`
  - [ ] `ansible/inventory.ini`
  - [ ] `ansible/ansible.cfg`
  - [ ] `ansible/templates/` directory with 3 files

## Configuration

### PEM Key Setup
- [ ] Copied PEM key to `ansible/newsrec.pem`
- [ ] Set correct permissions: `chmod 600 ansible/newsrec.pem`
- [ ] Tested SSH connection:
  ```bash
  ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
  ```

### Inventory Configuration
- [ ] Opened `ansible/inventory.ini`
- [ ] Replaced `YOUR_EC2_IP` with actual EC2 public IP
- [ ] Verified SSH user:
  - [ ] `ec2-user` for Amazon Linux 2
  - [ ] `ubuntu` for Ubuntu
- [ ] Saved file

### Environment Variables
- [ ] Noted NewsAPI key: `d4c96b43d3c04883a2790bd6c78d0117`
- [ ] (Optional) Created GitHub repository for code
- [ ] (Optional) Updated GitHub URL in deployment command

## Pre-Deployment Verification

### Connectivity Tests
- [ ] SSH connection works:
  ```bash
  ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP "echo 'Connected'"
  ```
- [ ] Ansible connectivity works:
  ```bash
  cd ansible
  ansible all -i inventory.ini -m ping
  ```

### File Verification
- [ ] All required files present in `ansible/` directory
- [ ] Templates directory has 3 files
- [ ] `deploy.yml` is readable
- [ ] `inventory.ini` has correct IP

## Deployment

### Choose Deployment Method

#### Option A: Automated Script (Recommended)
- [ ] Windows (PowerShell):
  ```powershell
  cd ansible
  .\deploy.ps1
  ```
- [ ] Linux/Mac (Bash):
  ```bash
  cd ansible
  chmod +x deploy.sh
  ./deploy.sh
  ```

#### Option B: Manual Ansible Command
- [ ] Opened terminal/PowerShell
- [ ] Navigated to `ansible/` directory
- [ ] Ran command:
  ```bash
  ansible-playbook deploy.yml -i inventory.ini \
    -e "newsapi_api_key=d4c96b43d3c04883a2790bd6c78d0117"
  ```

### During Deployment
- [ ] Watched for any error messages
- [ ] Noted any warnings
- [ ] Deployment completed successfully
- [ ] No critical errors reported

## Post-Deployment Verification

### API Health Check
- [ ] Health endpoint responds:
  ```bash
  curl http://YOUR_EC2_IP/api/health
  ```
- [ ] Response includes: `{"status": "healthy", ...}`

### API Documentation
- [ ] Access Swagger docs: `http://YOUR_EC2_IP/docs`
- [ ] All endpoints visible
- [ ] Can expand endpoint details

### Test API Endpoints
- [ ] Search endpoint works:
  ```bash
  curl -X POST http://YOUR_EC2_IP/api/search \
    -H "Content-Type: application/json" \
    -d '{"query": "artificial intelligence"}'
  ```
- [ ] Trending endpoint works:
  ```bash
  curl http://YOUR_EC2_IP/api/trending
  ```
- [ ] Top headlines endpoint works:
  ```bash
  curl "http://YOUR_EC2_IP/api/top-headlines?category=technology"
  ```

### Service Status
- [ ] SSH into instance:
  ```bash
  ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
  ```
- [ ] Check supervisor status:
  ```bash
  sudo supervisorctl status
  ```
- [ ] Check Nginx status:
  ```bash
  sudo systemctl status nginx
  ```
- [ ] View application logs:
  ```bash
  sudo tail -f /var/log/news-recommender-api.log
  ```

## Troubleshooting (if needed)

### SSH Connection Issues
- [ ] Verified EC2 IP is correct
- [ ] Checked security group allows port 22
- [ ] Verified PEM file permissions: `chmod 600`
- [ ] Verified SSH user (ec2-user vs ubuntu)

### Ansible Issues
- [ ] Ran: `ansible all -i inventory.ini -m ping`
- [ ] Checked inventory.ini syntax
- [ ] Verified SSH key path
- [ ] Verified EC2 instance is running

### Application Issues
- [ ] Checked logs: `sudo tail -f /var/log/news-recommender-api.log`
- [ ] Restarted application: `sudo supervisorctl restart news-recommender-api`
- [ ] Checked Nginx: `sudo systemctl status nginx`
- [ ] Verified data directory exists: `ls -la /home/newsrec/news-recommender-api/data/`

## Post-Deployment Tasks

### Security
- [ ] Restricted SSH access to your IP in security group
- [ ] (Optional) Set up SSL/TLS certificate with Certbot
- [ ] (Optional) Enable firewall rules

### Monitoring
- [ ] Set up log monitoring
- [ ] (Optional) Configure CloudWatch alarms
- [ ] (Optional) Set up email alerts

### Frontend Deployment
- [ ] Update API URL in frontend config
- [ ] Deploy frontend to Vercel or Netlify
- [ ] Test frontend with deployed API

### Documentation
- [ ] Documented EC2 IP address
- [ ] Documented deployment date
- [ ] Documented any custom configurations
- [ ] Shared deployment guide with team

## Maintenance Checklist

### Regular Tasks
- [ ] Monitor application logs weekly
- [ ] Check disk usage monthly
- [ ] Update system packages monthly
- [ ] Review security group rules quarterly

### Backup & Recovery
- [ ] (Optional) Set up automated backups
- [ ] Document rollback procedure
- [ ] Test rollback procedure
- [ ] Keep PEM key in secure location

### Performance
- [ ] Monitor API response times
- [ ] Check CPU and memory usage
- [ ] Increase workers if needed
- [ ] Enable caching if applicable

## Useful Commands Reference

```bash
# SSH into instance
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP

# View logs
sudo tail -f /var/log/news-recommender-api.log

# Restart application
sudo supervisorctl restart news-recommender-api

# Check status
sudo supervisorctl status

# Restart Nginx
sudo systemctl restart nginx

# Check disk usage
df -h

# Check memory
free -h

# Update application
cd /home/newsrec/news-recommender-api
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart news-recommender-api
```

## Deployment Summary

**Deployment Date:** _______________

**EC2 Instance IP:** _______________

**Instance Type:** _______________

**OS:** _______________

**Deployment Status:** ✅ Successful / ❌ Failed

**Notes:**
```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

**Deployed By:** _______________

**Verified By:** _______________

---

## Next Steps After Deployment

1. ✅ Monitor application for 24 hours
2. ✅ Set up SSL/TLS certificate
3. ✅ Deploy frontend application
4. ✅ Configure monitoring and alerts
5. ✅ Document any custom configurations
6. ✅ Create runbook for team

---

**Deployment Complete!** 🎉

For support, refer to:
- `QUICK_START_ANSIBLE.md` - Quick reference
- `ANSIBLE_DEPLOYMENT_GUIDE.md` - Detailed guide
- `ansible/README.md` - Ansible documentation
