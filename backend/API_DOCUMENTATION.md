# CampusConnect API Documentation

This document provides comprehensive documentation for all endpoints available in the CampusConnect backend API. Frontend developers can use this as a reference when integrating with the backend.

## Base URL

All endpoints are prefixed with: `http://localhost:5000/api`

For production, this will be replaced with your domain.

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header as follows:

```
Authorization: Bearer <your_jwt_token>
```

## User Authentication Endpoints

### Register User
- **URL**: `/users/register`
- **Method**: `POST`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "username": "testuser",
    "email": "testuser@college.edu",
    "password": "Test@123",
    "name": "Test User",
    "year": "3rd Year",
    "department": "Computer Science",
    "college": "Test College"
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Registration successful. Please verify your email.",
    "data": {
      "user_id": "user_id_string",
      "verification_code": "123456"
    }
  }
  ```

### Verify Email
- **URL**: `/users/verify`
- **Method**: `POST`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "testuser@college.edu",
    "verification_code": "123456"
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Email verified successfully",
    "data": {
      "token": "jwt_token_string",
      "user_id": "user_id_string"
    }
  }
  ```

### Login
- **URL**: `/users/login`
- **Method**: `POST`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "testuser@college.edu",
    "password": "Test@123"
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Login successful",
    "data": {
      "token": "jwt_token_string",
      "user": {
        "id": "user_id_string",
        "username": "testuser",
        "name": "Test User",
        "email": "testuser@college.edu",
        "role": "student"
      }
    }
  }
  ```

### Get User Profile
- **URL**: `/users/profile`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "id": "user_id_string",
      "username": "testuser",
      "email": "testuser@college.edu",
      "name": "Test User",
      "year": "3rd Year",
      "department": "Computer Science",
      "college": "Test College",
      "created_at": "2025-05-26T10:00:00.000Z",
      "last_active": "2025-05-26T10:30:00.000Z",
      "role": "student",
      "profile_picture": null,
      "bio": null,
      "social_links": {},
      "skills": [],
      "is_verified": true,
      "preferences": {
        "email_notifications": true,
        "push_notifications": true
      }
    }
  }
  ```

### Update User Profile
- **URL**: `/users/profile`
- **Method**: `PUT`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "Updated Name",
    "bio": "This is my updated bio",
    "year": "4th Year",
    "department": "Computer Science",
    "profile_picture": "profile_picture_url",
    "social_links": {
      "linkedin": "https://linkedin.com/in/username",
      "github": "https://github.com/username"
    },
    "skills": ["Python", "JavaScript", "MongoDB"]
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Profile updated successfully"
  }
  ```

### Change Password
- **URL**: `/users/change-password`
- **Method**: `POST`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "current_password": "Test@123",
    "new_password": "NewTest@123"
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Password changed successfully"
  }
  ```

### Get Users List
- **URL**: `/users`
- **Method**: `GET`
- **Authentication**: Required
- **Query Parameters**:
  - `search`: Search term for username, name, or email
  - `department`: Filter by department
  - `year`: Filter by year
  - `college`: Filter by college
  - `limit`: Number of users to return (default: 20)
  - `skip`: Number of users to skip (for pagination)
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "users": [
        {
          "id": "user_id_string",
          "username": "testuser",
          "name": "Test User",
          "email": "testuser@college.edu",
          "department": "Computer Science",
          "year": "3rd Year",
          "college": "Test College",
          "profile_picture": null
        }
      ],
      "total_count": 100,
      "has_more": true
    }
  }
  ```

### Get Specific User
- **URL**: `/users/<user_id>`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "id": "user_id_string",
      "username": "testuser",
      "name": "Test User",
      "email": "testuser@college.edu",
      "department": "Computer Science",
      "year": "3rd Year",
      "college": "Test College",
      "profile_picture": null,
      "bio": null,
      "social_links": {},
      "skills": []
    }
  }
  ```

## Social Feed Endpoints

### Create Post
- **URL**: `/social-feed/posts`
- **Method**: `POST`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "title": "Test Post",
    "content": "This is a test post content.",
    "category": "general",
    "tags": ["test", "api"]
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Post created successfully",
    "data": {
      "post_id": "post_id_string"
    }
  }
  ```

### Get Posts
- **URL**: `/social-feed/posts`
- **Method**: `GET`
- **Authentication**: Required
- **Query Parameters**:
  - `search`: Search term in title or content
  - `category`: Filter by category
  - `tags`: Filter by tags (comma-separated)
  - `limit`: Number of posts to return (default: 20)
  - `skip`: Number of posts to skip (for pagination)
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "posts": [
        {
          "id": "post_id_string",
          "title": "Test Post",
          "content": "This is a test post content.",
          "category": "general",
          "tags": ["test", "api"],
          "author": {
            "id": "user_id_string",
            "username": "testuser",
            "name": "Test User",
            "profile_picture": null
          },
          "created_at": "2025-05-26T10:00:00.000Z",
          "likes_count": 5,
          "comments_count": 2,
          "is_liked": false
        }
      ],
      "total_count": 100,
      "has_more": true
    }
  }
  ```

### Get Specific Post
- **URL**: `/social-feed/posts/<post_id>`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "id": "post_id_string",
      "title": "Test Post",
      "content": "This is a test post content.",
      "category": "general",
      "tags": ["test", "api"],
      "author": {
        "id": "user_id_string",
        "username": "testuser",
        "name": "Test User",
        "profile_picture": null
      },
      "created_at": "2025-05-26T10:00:00.000Z",
      "likes_count": 5,
      "comments_count": 2,
      "is_liked": false,
      "comments": [
        {
          "id": "comment_id_string",
          "content": "This is a comment",
          "author": {
            "id": "user_id_string",
            "username": "commenter",
            "name": "Commenter User",
            "profile_picture": null
          },
          "created_at": "2025-05-26T10:30:00.000Z",
          "likes_count": 1,
          "is_liked": false
        }
      ]
    }
  }
  ```

### Update Post
- **URL**: `/social-feed/posts/<post_id>`
- **Method**: `PUT`
- **Authentication**: Required (must be post author)
- **Request Body**:
  ```json
  {
    "title": "Updated Post Title",
    "content": "Updated post content",
    "category": "general",
    "tags": ["updated", "api"]
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Post updated successfully"
  }
  ```

### Delete Post
- **URL**: `/social-feed/posts/<post_id>`
- **Method**: `DELETE`
- **Authentication**: Required (must be post author)
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Post deleted successfully"
  }
  ```

### Like/Unlike Post
- **URL**: `/social-feed/posts/<post_id>/like`
- **Method**: `POST`
- **Authentication**: Required
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Post liked successfully",
    "data": {
      "likes_count": 6
    }
  }
  ```

### Add Comment
- **URL**: `/social-feed/posts/<post_id>/comments`
- **Method**: `POST`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "content": "This is a comment"
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Comment added successfully",
    "data": {
      "comment_id": "comment_id_string"
    }
  }
  ```

## Resources Endpoints

### Upload Resource
- **URL**: `/resources/upload`
- **Method**: `POST`
- **Authentication**: Required
- **Request Body**: Form data with the following fields:
  - `file`: The file to upload
  - `title`: Resource title
  - `description`: Resource description
  - `subject`: Subject related to the resource
  - `semester`: Semester related to the resource
  - `type`: Type of resource (Notes, Assignment, etc.)
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Resource uploaded successfully",
    "data": {
      "resource_id": "resource_id_string"
    }
  }
  ```

### Get Resources
- **URL**: `/resources`
- **Method**: `GET`
- **Authentication**: Required
- **Query Parameters**:
  - `search`: Search term in title or description
  - `subject`: Filter by subject
  - `semester`: Filter by semester
  - `type`: Filter by resource type
  - `limit`: Number of resources to return (default: 20)
  - `skip`: Number of resources to skip (for pagination)
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "resources": [
        {
          "id": "resource_id_string",
          "title": "Test Resource",
          "description": "This is a test resource",
          "subject": "Computer Science",
          "semester": "Fall 2023",
          "type": "Notes",
          "file_url": "file_url_string",
          "file_type": "pdf",
          "file_size": 1024,
          "uploader": {
            "id": "user_id_string",
            "username": "testuser",
            "name": "Test User",
            "profile_picture": null
          },
          "uploaded_at": "2025-05-26T10:00:00.000Z",
          "upvotes_count": 5,
          "is_upvoted": false
        }
      ],
      "total_count": 100,
      "has_more": true
    }
  }
  ```

### Get Specific Resource
- **URL**: `/resources/<resource_id>`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "id": "resource_id_string",
      "title": "Test Resource",
      "description": "This is a test resource",
      "subject": "Computer Science",
      "semester": "Fall 2023",
      "type": "Notes",
      "file_url": "file_url_string",
      "file_type": "pdf",
      "file_size": 1024,
      "uploader": {
        "id": "user_id_string",
        "username": "testuser",
        "name": "Test User",
        "profile_picture": null
      },
      "uploaded_at": "2025-05-26T10:00:00.000Z",
      "upvotes_count": 5,
      "is_upvoted": false,
      "comments": [
        {
          "id": "comment_id_string",
          "content": "This is a comment",
          "author": {
            "id": "user_id_string",
            "username": "commenter",
            "name": "Commenter User",
            "profile_picture": null
          },
          "created_at": "2025-05-26T10:30:00.000Z"
        }
      ]
    }
  }
  ```

### Upvote Resource
- **URL**: `/resources/<resource_id>/upvote`
- **Method**: `POST`
- **Authentication**: Required
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Resource upvoted successfully",
    "data": {
      "upvotes_count": 6
    }
  }
  ```

## Opportunities Endpoints

### Create Opportunity
- **URL**: `/opportunities`
- **Method**: `POST`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "title": "Test Opportunity",
    "description": "This is a test opportunity.",
    "type": "internship",
    "domain": "Software Development",
    "is_paid": true,
    "compensation": "$15/hour",
    "company": "Test Company",
    "location": "Remote",
    "remote": true,
    "skills_required": ["Python", "Flask", "MongoDB"],
    "deadline": "2025-12-31T23:59:59"
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Opportunity created successfully",
    "data": {
      "opportunity_id": "opportunity_id_string"
    }
  }
  ```

### Get Opportunities
- **URL**: `/opportunities`
- **Method**: `GET`
- **Authentication**: Required
- **Query Parameters**:
  - `search`: Search term in title or description
  - `type`: Filter by opportunity type
  - `domain`: Filter by domain
  - `is_paid`: Filter by paid status (true/false)
  - `remote`: Filter by remote status (true/false)
  - `limit`: Number of opportunities to return (default: 20)
  - `skip`: Number of opportunities to skip (for pagination)
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "opportunities": [
        {
          "id": "opportunity_id_string",
          "title": "Test Opportunity",
          "description": "This is a test opportunity.",
          "type": "internship",
          "domain": "Software Development",
          "is_paid": true,
          "compensation": "$15/hour",
          "company": "Test Company",
          "location": "Remote",
          "remote": true,
          "skills_required": ["Python", "Flask", "MongoDB"],
          "deadline": "2025-12-31T23:59:59",
          "poster": {
            "id": "user_id_string",
            "username": "testuser",
            "name": "Test User",
            "profile_picture": null
          },
          "created_at": "2025-05-26T10:00:00.000Z",
          "applications_count": 3,
          "has_applied": false
        }
      ],
      "total_count": 100,
      "has_more": true
    }
  }
  ```

### Get Specific Opportunity
- **URL**: `/opportunities/<opportunity_id>`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "id": "opportunity_id_string",
      "title": "Test Opportunity",
      "description": "This is a test opportunity.",
      "type": "internship",
      "domain": "Software Development",
      "is_paid": true,
      "compensation": "$15/hour",
      "company": "Test Company",
      "location": "Remote",
      "remote": true,
      "skills_required": ["Python", "Flask", "MongoDB"],
      "deadline": "2025-12-31T23:59:59",
      "poster": {
        "id": "user_id_string",
        "username": "testuser",
        "name": "Test User",
        "profile_picture": null
      },
      "created_at": "2025-05-26T10:00:00.000Z",
      "applications_count": 3,
      "has_applied": false
    }
  }
  ```

### Apply for Opportunity
- **URL**: `/opportunities/<opportunity_id>/apply`
- **Method**: `POST`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "cover_letter": "This is my cover letter for the opportunity.",
    "resume_url": "resume_url_string",
    "additional_info": "Additional information about my application"
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Application submitted successfully",
    "data": {
      "application_id": "application_id_string"
    }
  }
  ```

## Study Groups Endpoints

### Create Study Group
- **URL**: `/study-groups`
- **Method**: `POST`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "Test Study Group",
    "description": "This is a test study group.",
    "subject": "Computer Science",
    "meeting_schedule": "Every Monday at 5 PM",
    "meeting_location": "Library Room 101",
    "is_virtual": true,
    "virtual_meeting_link": "https://meet.example.com/testgroup",
    "max_members": 10,
    "is_private": false,
    "tags": ["programming", "algorithms", "data structures"]
  }
  ```
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Study group created successfully",
    "data": {
      "group_id": "group_id_string"
    }
  }
  ```

### Get Study Groups
- **URL**: `/study-groups`
- **Method**: `GET`
- **Authentication**: Required
- **Query Parameters**:
  - `subject`: Filter by subject
  - `search`: Search term in name or description
  - `limit`: Number of groups to return (default: 20)
  - `skip`: Number of groups to skip (for pagination)
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "study_groups": [
        {
          "_id": "group_id_string",
          "name": "Test Study Group",
          "description": "This is a test study group.",
          "subject": "Computer Science",
          "creator": {
            "id": "user_id_string",
            "username": "testuser",
            "name": "Test User",
            "profile_picture": null
          },
          "created_at": "2025-05-26T10:00:00.000Z",
          "member_count": 1,
          "is_member": false
        }
      ],
      "total_count": 100,
      "has_more": true
    }
  }
  ```

### Get Specific Study Group
- **URL**: `/study-groups/<group_id>`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "_id": "group_id_string",
      "name": "Test Study Group",
      "description": "This is a test study group.",
      "subject": "Computer Science",
      "meeting_schedule": "Every Monday at 5 PM",
      "meeting_location": "Library Room 101",
      "is_virtual": true,
      "virtual_meeting_link": "https://meet.example.com/testgroup",
      "max_members": 10,
      "is_private": false,
      "tags": ["programming", "algorithms", "data structures"],
      "creator": {
        "id": "user_id_string",
        "username": "testuser",
        "name": "Test User",
        "profile_picture": null
      },
      "created_at": "2025-05-26T10:00:00.000Z",
      "members": [
        {
          "id": "user_id_string",
          "username": "testuser",
          "name": "Test User",
          "profile_picture": null,
          "role": "admin",
          "joined_at": "2025-05-26T10:00:00.000Z"
        }
      ],
      "member_count": 1,
      "is_member": false,
      "discussions": [
        {
          "_id": "discussion_id_string",
          "title": "Discussion Title",
          "content": "Discussion content",
          "author": {
            "id": "user_id_string",
            "username": "testuser",
            "name": "Test User",
            "profile_picture": null
          },
          "created_at": "2025-05-26T10:30:00.000Z"
        }
      ]
    }
  }
  ```

### Join Study Group
- **URL**: `/study-groups/<group_id>/join`
- **Method**: `POST`
- **Authentication**: Required
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Successfully joined the study group"
  }
  ```

### Leave Study Group
- **URL**: `/study-groups/<group_id>/leave`
- **Method**: `POST`
- **Authentication**: Required
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Successfully left the study group"
  }
  ```

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "status": "error",
  "message": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (invalid input)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `500`: Server error

## CORS Support

The API supports Cross-Origin Resource Sharing (CORS) for all endpoints, allowing frontend applications to make requests from different domains.

## Rate Limiting

To prevent abuse, the API implements rate limiting. If you exceed the rate limit, you'll receive a `429 Too Many Requests` response.

## API Versioning

The current API version is v1. The version is included in the response headers.

## Conclusion

This documentation covers all the endpoints available in the CampusConnect backend API. If you have any questions or need further clarification, please contact the backend development team.
