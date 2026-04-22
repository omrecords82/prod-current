import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Menu,
  MenuItem,
  CircularProgress,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  meta_description: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'internal' | 'church-only';
  author_name: string;
  created_at: string;
  updated_at: string;
  published_at: string;
}

interface BlogStats {
  total: number;
  published: number;
  drafts: number;
  archived: number;
}

const BlogAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<BlogStats>({ total: 0, published: 0, drafts: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);

  // Load user's blog posts
  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/api/blogs/author/${user?.id}`);
      setPosts(response.data);

      // Calculate stats
      const total = response.data.length;
      const published = response.data.filter((p: BlogPost) => p.status === 'published').length;
      const drafts = response.data.filter((p: BlogPost) => p.status === 'draft').length;
      const archived = response.data.filter((p: BlogPost) => p.status === 'archived').length;
      
      setStats({ total, published, drafts, archived });
    } catch (error: any) {
      console.error('Error loading blog posts:', error);
      setError('Failed to load your blog posts');
    } finally {
      setLoading(false);
    }
  };

  // Load posts on mount
  useEffect(() => {
    if (user?.id) {
      loadPosts();
    }
  }, [user?.id]);

  // Handle delete post
  const handleDeletePost = async () => {
    if (!selectedPost) return;

    try {
      await axios.delete(`/api/blogs/${selectedPost.slug}`);
      await loadPosts(); // Refresh the list
      setDeleteDialogOpen(false);
      setSelectedPost(null);
    } catch (error: any) {
      console.error('Error deleting post:', error);
      setError('Failed to delete blog post');
    }
  };

  // Handle create new post
  const handleCreatePost = () => {
    navigate('/admin/tools/page-editor?contentType=blog');
  };

  // Handle edit post
  const handleEditPost = (post: BlogPost) => {
    navigate(`/admin/tools/page-editor?contentType=blog&slug=${post.slug}`);
  };

  // Handle view post
  const handleViewPost = (post: BlogPost) => {
    if (post.status === 'published') {
      navigate(`/blog/${post.slug}`);
    } else {
      // Preview mode for drafts
      navigate(`/admin/tools/page-editor?contentType=blog&slug=${post.slug}&preview=true`);
    }
  };

  // Handle action menu
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, post: BlogPost) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedPost(post);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedPost(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status chip color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  // Get visibility chip color
  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'success';
      case 'internal': return 'warning';
      case 'church-only': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Blog Administration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your blog posts and track their performance
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreatePost}
        >
          New Blog Post
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ArticleIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Posts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.published}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Published
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.drafts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Drafts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ArchiveIcon sx={{ fontSize: 40, color: 'text.secondary', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.archived}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Archived
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Posts Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your Blog Posts
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : posts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ArticleIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No blog posts yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first blog post to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreatePost}
              >
                Create Your First Post
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Title</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Visibility</strong></TableCell>
                    <TableCell><strong>Created</strong></TableCell>
                    <TableCell><strong>Updated</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {post.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          /{post.slug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={post.status}
                          size="small"
                          color={getStatusColor(post.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={post.visibility.replace('-', ' ')}
                          size="small"
                          color={getVisibilityColor(post.visibility) as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(post.created_at)}
                      </TableCell>
                      <TableCell>
                        {formatDate(post.updated_at)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleActionMenuOpen(e, post)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => { handleViewPost(selectedPost!); handleActionMenuClose(); }}>
          <VisibilityIcon sx={{ mr: 1 }} />
          {selectedPost?.status === 'published' ? 'View Post' : 'Preview'}
        </MenuItem>
        <MenuItem onClick={() => { handleEditPost(selectedPost!); handleActionMenuClose(); }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => { setDeleteDialogOpen(true); handleActionMenuClose(); }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Blog Post</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedPost?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeletePost} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BlogAdmin; 