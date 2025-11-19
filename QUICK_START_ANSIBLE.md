# Quick Start: Ansible Deployment to AWS EC2

## 5-Minute Setup

### Step 1: Install Ansible
```bash
pip install ansible
```

### Step 2: Prepare Your EC2 Instance
1. Launch an EC2 instance (Amazon Linux 2 or Ubuntu)
2. Download the `.pem` key file
3. Note the public IP address

### Step 3: Configure Ansible
```bash
cd ansible

# Copy your PEM key
cp /path/to/your/newsrec.pem .
chmod 600 newsrec.pem

# Update inventory.ini with your EC2 IP
# Replace YOUR_EC2_IP with actual IP
```

Edit `ansible/inventory.ini`:
```ini
[aws_ec2]
news-recommender-server ansible_host=YOUR_EC2_IP ansible_user=ec2-user ansible_ssh_private_key_file=./newsrec.pem
```

### Step 4: Run Deployment

**Option A: Using PowerShell (Windows)**
```powershell
cd ansible
.\deploy.ps1
```

**Option B: Using Bash (Linux/Mac)**
```bash
cd ansible
chmod +x deploy.sh
./deploy.sh
```

**Option C: Manual Ansible Command**
```bash
cd ansible
ansible-playbook deploy.yml -i inventory.ini \
  -e "newsapi_api_key=d4c96b43d3c04883a2790bd6c78d0117"
```

### Step 5: Verify Deployment
```bash
# Check API health
curl http://YOUR_EC2_IP/api/health

# Access API docs
open http://YOUR_EC2_IP/docs
```

## What Gets Deployed

✓ Python 3 + Virtual Environment
✓ FastAPI Application
✓ Nginx Reverse Proxy
✓ Supervisor Process Manager
✓ MIND Dataset (optional)
✓ Auto-restart on failure
✓ Logging configured

## Troubleshooting

### SSH Connection Failed
```bash
# Test SSH manually
ssh -i newsrec.pem ec2-user@YOUR_EC2_IP

# Common fixes:
# 1. chmod 600 newsrec.pem
# 2. Check security group allows port 22
# 3. Verify correct EC2 IP
```

### Ansible Connection Failed
```bash
# Test Ansible connectivity
ansible all -i inventory.ini -m ping

# If fails, check inventory.ini syntax
```

### API Not Responding
```bash
# SSH into instance
ssh -i newsrec.pem ec2-user@YOUR_EC2_IP

# Check application status
sudo supervisorctl status

# View logs
sudo tail -f /var/log/news-recommender-api.log

# Restart if needed
sudo supervisorctl restart news-recommender-api
```

## Next Steps

1. **Set up SSL/TLS** (recommended for production)
   ```bash
   ssh -i newsrec.pem ec2-user@YOUR_EC2_IP
   sudo certbot --nginx -d your-domain.com
   ```

2. **Deploy Frontend** to Vercel or Netlify
   - Update API URL in frontend config
   - Deploy to your preferred platform

3. **Monitor Application**
   - Set up CloudWatch alarms
   - Configure log aggregation
   - Monitor API performance

4. **Scale Application**
   - Increase Supervisor workers
   - Add load balancing
   - Use Auto Scaling Groups

## File Structure

```
ansible/
├── inventory.ini              # EC2 hosts configuration
├── deploy.yml                 # Main playbook
├── ansible.cfg                # Ansible configuration
├── deploy.sh                  # Bash deployment script
├── deploy.ps1                 # PowerShell deployment script
├── templates/
│   ├── env.j2                 # Environment variables
│   ├── supervisor_fastapi.conf.j2  # Supervisor config
│   └── nginx.conf.j2          # Nginx config
└── newsrec.pem               # Your SSH key (add this)
```

## Common Commands

```bash
# Test SSH connection
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP

# View application logs
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP sudo tail -f /var/log/news-recommender-api.log

# Restart application
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP sudo supervisorctl restart news-recommender-api

# Check Nginx status
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP sudo systemctl status nginx

# Redeploy (pull latest code)
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
cd /home/newsrec/news-recommender-api
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart news-recommender-api
```

## Security Notes

1. **SSH Key**: Keep `newsrec.pem` secure, never commit to Git
2. **API Key**: Store in `.env` file, not in code
3. **Firewall**: Restrict SSH to your IP only
4. **HTTPS**: Use SSL/TLS in production
5. **Updates**: Keep system packages updated

## Performance Tips

1. **Increase Workers**: Edit supervisor config to use more workers
2. **Enable Caching**: Add Redis for caching
3. **Optimize Database**: Use connection pooling
4. **Monitor Resources**: Watch CPU and memory usage

---

**Deployment successful!** Your API is now running on AWS EC2.

For detailed information, see `ANSIBLE_DEPLOYMENT_GUIDE.md`
