output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "lb_controller_role_arn" {
  description = "Use this ARN for the AWS Load Balancer Controller service account"
  value       = module.eks.lb_controller_role_arn
}

output "configure_kubectl" {
  description = "Run this to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${var.cluster_name}"
}
