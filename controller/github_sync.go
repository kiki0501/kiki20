package controller

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// GetGitHubSyncStatus 获取 GitHub 同步状态
func GetGitHubSyncStatus(c *gin.Context) {
	// 从数据库读取配置
	common.OptionMapRWMutex.RLock()
	token := common.OptionMap["GitHubSyncToken"]
	repo := common.OptionMap["GitHubSyncRepo"]
	lastSyncTime := common.OptionMap["GitHubSyncLastTime"]
	common.OptionMapRWMutex.RUnlock()
	
	enabled := token != "" && repo != ""
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enabled":        enabled,
			"last_sync_time": lastSyncTime,
		},
	})
}

// TriggerGitHubSync 手动触发 GitHub 同步
func TriggerGitHubSync(c *gin.Context) {
	// 从数据库读取配置
	common.OptionMapRWMutex.RLock()
	token := common.OptionMap["GitHubSyncToken"]
	repo := common.OptionMap["GitHubSyncRepo"]
	common.OptionMapRWMutex.RUnlock()
	
	if token == "" || repo == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "GitHub 同步未配置，请先配置 GitHub Token 和仓库地址",
		})
		return
	}
	
	// 执行同步
	err := syncDataToGitHub(token, repo)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "同步失败: " + err.Error(),
		})
		return
	}
	
	// 更新最后同步时间
	now := time.Now().Format("2006-01-02 15:04:05")
	_ = model.UpdateOption("GitHubSyncLastTime", now)
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "同步成功",
	})
}

// PullGitHubBackup 从 GitHub 拉取备份数据
func PullGitHubBackup(c *gin.Context) {
	// 从数据库读取配置
	common.OptionMapRWMutex.RLock()
	token := common.OptionMap["GitHubSyncToken"]
	repo := common.OptionMap["GitHubSyncRepo"]
	common.OptionMapRWMutex.RUnlock()
	
	if token == "" || repo == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "GitHub 同步未配置，请先配置 GitHub Token 和仓库地址",
		})
		return
	}
	
	// 执行拉取
	err := pullDataFromGitHub(token, repo)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "拉取失败: " + err.Error(),
		})
		return
	}
	
	// 更新最后同步时间
	now := time.Now().Format("2006-01-02 15:04:05")
	_ = model.UpdateOption("GitHubSyncLastTime", now)
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "拉取成功，数据已恢复",
	})
}

// syncDataToGitHub 同步数据到 GitHub
func syncDataToGitHub(token, repoURL string) error {
	// 解析仓库信息
	// 支持格式: https://github.com/owner/repo 或 owner/repo
	repoURL = strings.TrimPrefix(repoURL, "https://github.com/")
	repoURL = strings.TrimPrefix(repoURL, "http://github.com/")
	repoURL = strings.Trim(repoURL, "/")
	
	parts := strings.Split(repoURL, "/")
	if len(parts) != 2 {
		return fmt.Errorf("无效的仓库地址格式，应为: owner/repo")
	}
	owner, repo := parts[0], parts[1]
	
	// 1. 同步 Token 数据
	if err := syncTokens(token, owner, repo); err != nil {
		return fmt.Errorf("同步 Token 失败: %v", err)
	}
	
	// 2. 同步 Channel 数据
	if err := syncChannels(token, owner, repo); err != nil {
		return fmt.Errorf("同步 Channel 失败: %v", err)
	}
	
	// 3. 同步 Model 数据
	if err := syncModels(token, owner, repo); err != nil {
		return fmt.Errorf("同步 Model 失败: %v", err)
	}
	
	return nil
}

// syncTokens 同步令牌数据到 GitHub
func syncTokens(token, owner, repo string) error {
	// 获取所有令牌
	var tokens []model.Token
	if err := model.DB.Find(&tokens).Error; err != nil {
		return err
	}
	
	// 清除敏感字段
	for i := range tokens {
		tokens[i].Key = "" // 清空 key 字段
	}
	
	// 序列化为 JSON
	data, err := json.MarshalIndent(tokens, "", "  ")
	if err != nil {
		return err
	}
	
	// 上传到 GitHub
	return uploadToGitHub(token, owner, repo, "tokens.json", data)
}

// syncChannels 同步渠道数据到 GitHub
func syncChannels(token, owner, repo string) error {
	// 获取所有渠道
	var channels []model.Channel
	if err := model.DB.Find(&channels).Error; err != nil {
		return err
	}
	
	// 清除敏感字段
	for i := range channels {
		channels[i].Key = "" // 清空 key 字段
	}
	
	// 序列化为 JSON
	data, err := json.MarshalIndent(channels, "", "  ")
	if err != nil {
		return err
	}
	
	// 上传到 GitHub
	return uploadToGitHub(token, owner, repo, "channels.json", data)
}

// syncModels 同步模型数据到 GitHub
func syncModels(token, owner, repo string) error {
	// 获取所有模型
	var models []model.Model
	if err := model.DB.Find(&models).Error; err != nil {
		return err
	}
	
	// 序列化为 JSON
	data, err := json.MarshalIndent(models, "", "  ")
	if err != nil {
		return err
	}
	
	// 上传到 GitHub
	return uploadToGitHub(token, owner, repo, "models.json", data)
}

// uploadToGitHub 上传文件到 GitHub 仓库
func uploadToGitHub(token, owner, repo, path string, content []byte) error {
	// GitHub API URL
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, path)
	
	// 先获取文件的 SHA（如果文件存在）
	var sha string
	req, _ := http.NewRequest("GET", apiURL, nil)
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err == nil && resp.StatusCode == 200 {
		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()
		if s, ok := result["sha"].(string); ok {
			sha = s
		}
	}
	
	// 准备上传数据
	payload := map[string]interface{}{
		"message": fmt.Sprintf("Update %s - %s", path, time.Now().Format("2006-01-02 15:04:05")),
		"content": base64.StdEncoding.EncodeToString(content),
	}
	if sha != "" {
		payload["sha"] = sha
	}
	
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	
	// 上传文件
	req, err = http.NewRequest("PUT", apiURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("Content-Type", "application/json")
	
	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		var errResp map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("GitHub API 错误 (%d): %v", resp.StatusCode, errResp)
	}
	
	return nil
}

// pullDataFromGitHub 从 GitHub 拉取备份数据
func pullDataFromGitHub(token, repoURL string) error {
	// 解析仓库信息
	repoURL = strings.TrimPrefix(repoURL, "https://github.com/")
	repoURL = strings.TrimPrefix(repoURL, "http://github.com/")
	repoURL = strings.Trim(repoURL, "/")
	
	parts := strings.Split(repoURL, "/")
	if len(parts) != 2 {
		return fmt.Errorf("无效的仓库地址格式，应为: owner/repo")
	}
	owner, repo := parts[0], parts[1]
	
	// 1. 拉取 Token 数据
	if err := pullTokens(token, owner, repo); err != nil {
		return fmt.Errorf("拉取 Token 失败: %v", err)
	}
	
	// 2. 拉取 Channel 数据
	if err := pullChannels(token, owner, repo); err != nil {
		return fmt.Errorf("拉取 Channel 失败: %v", err)
	}
	
	// 3. 拉取 Model 数据
	if err := pullModels(token, owner, repo); err != nil {
		return fmt.Errorf("拉取 Model 失败: %v", err)
	}
	
	return nil
}

// pullTokens 从 GitHub 拉取令牌数据
func pullTokens(token, owner, repo string) error {
	data, err := downloadFromGitHub(token, owner, repo, "tokens.json")
	if err != nil {
		return err
	}
	
	var tokens []model.Token
	if err := json.Unmarshal(data, &tokens); err != nil {
		return fmt.Errorf("解析 tokens.json 失败: %v", err)
	}
	
	// 批量更新或插入（注意：这里不会恢复 key 字段，因为备份时已排除）
	for _, t := range tokens {
		var existing model.Token
		err := model.DB.Where("id = ?", t.Id).First(&existing).Error
		if err == nil {
			// 更新现有记录（保留原有的 key）
			t.Key = existing.Key
			model.DB.Model(&existing).Updates(t)
		} else {
			// 插入新记录（需要用户手动设置 key）
			model.DB.Create(&t)
		}
	}
	
	return nil
}

// pullChannels 从 GitHub 拉取渠道数据
func pullChannels(token, owner, repo string) error {
	data, err := downloadFromGitHub(token, owner, repo, "channels.json")
	if err != nil {
		return err
	}
	
	var channels []model.Channel
	if err := json.Unmarshal(data, &channels); err != nil {
		return fmt.Errorf("解析 channels.json 失败: %v", err)
	}
	
	// 批量更新或插入
	for _, ch := range channels {
		var existing model.Channel
		err := model.DB.Where("id = ?", ch.Id).First(&existing).Error
		if err == nil {
			// 更新现有记录（保留原有的 key）
			ch.Key = existing.Key
			model.DB.Model(&existing).Updates(ch)
		} else {
			// 插入新记录
			model.DB.Create(&ch)
		}
	}
	
	return nil
}

// pullModels 从 GitHub 拉取模型数据
func pullModels(token, owner, repo string) error {
	data, err := downloadFromGitHub(token, owner, repo, "models.json")
	if err != nil {
		return err
	}
	
	var models []model.Model
	if err := json.Unmarshal(data, &models); err != nil {
		return fmt.Errorf("解析 models.json 失败: %v", err)
	}
	
	// 批量更新或插入
	for _, m := range models {
		var existing model.Model
		err := model.DB.Where("id = ?", m.Id).First(&existing).Error
		if err == nil {
			// 更新现有记录
			model.DB.Model(&existing).Updates(m)
		} else {
			// 插入新记录
			model.DB.Create(&m)
		}
	}
	
	return nil
}

// downloadFromGitHub 从 GitHub 下载文件
func downloadFromGitHub(token, owner, repo, path string) ([]byte, error) {
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, path)
	
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub API 错误 (%d): 文件 %s 不存在或无法访问", resp.StatusCode, path)
	}
	
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	
	// 获取 base64 编码的内容
	contentStr, ok := result["content"].(string)
	if !ok {
		return nil, fmt.Errorf("无法获取文件内容")
	}
	
	// 移除换行符
	contentStr = strings.ReplaceAll(contentStr, "\n", "")
	
	// Base64 解码
	data, err := base64.StdEncoding.DecodeString(contentStr)
	if err != nil {
		return nil, fmt.Errorf("Base64 解码失败: %v", err)
	}
	
	return data, nil
}